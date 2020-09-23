const express = require("express");
const ClientId = "159894829619272";
const ClientSecret = "R6wl7XZcQbNn2bsNt5FlChi61cLvXchA";
const redirectionUrl = "https://api.luwan.club/api/v1/tulip/callback";
const tulipApiUrl = "https://open.tulipsport.com";
const session = require("express-session");

const stravaApiUrl = "https://www.strava.com/api/v3";

const rp = require("request-promise");

const fs = require("fs");

//starting the express app
const app = express();

app.use(
  session({
    secret: "secret", // 对session id 相关的cookie 进行签名
    resave: false,
    saveUninitialized: false, // 是否保存未初始化的会话
    cookie: {
      maxAge: 1000 * 60 * 30, // 设置 session 的有效时间，单位毫秒
    },
  })
);

//this is the base route
app.get("/tulip", async function (req, res) {
  const url = getAuthurl();
  res.send(`<a href=${url}>Authorize Tulip App</a>`);
});
app.get("/api/v1/tulip/callback", async function (req, res) {
  const { code, scope } = req.query;
  if (code) {
    const reqTokenUrl = getTokenUrl(code, scope);
    const tulip_token = await rp(reqTokenUrl);
    req.session.tulip_token = tulip_token;
    // res.sendFile(__dirname + "/bindok.html");
    const data = fs.readFileSync(__dirname + "/bindok.html");
    const html = data
      .toString()
      .replace("$$$$", JSON.stringify(tulip_token).replace(/"/g, "'"));
    res.set("Content-Type", "text/html");
    res.send(html);
  }
});

app.get("/strava", (req, res) => {
  const url = `http://www.strava.com/oauth/authorize?client_id=22580&response_type=code&redirect_uri=https://api.luwan.club/api/v1/strava/callback&approval_prompt=force&scope=read`;
  res.send(`<a href=${url}>Authorize Strava App</a>`);
});

app.get("/api/v1/strava/callback", async function (req, res) {
  const { code } = req.query;
  const tokenUrl = `${stravaApiUrl}/oauth/token?client_id=22580&client_secret=427267881c103f35f75d833992a92fc50226c14d&code=${code}&grant_type=authorization_code`;
  res.send(tokenUrl);
  return;
  const data = await rp({
    uri: tokenUrl,
  });
  const {
    token_type,
    expires_at,
    expires_in,
    refresh_token,
    access_token,
  } = data;
  req.session.refresh_token = refresh_token;
  req.session.strava_token = access_token;
  res.send(data);
});

app.get("/api/v1/strava/getToken", async function (req, res) {
  res.send(req.session.strava_token);
});

app.get("/api/v1/strava/refreshToken", async function (req, res) {
  const { refresh_token } = req.query;
  const tokenUrl = `${stravaApiUrl}/oauth/token?client_id=22580&client_secret=427267881c103f35f75d833992a92fc50226c14d&refresh_token=${
    refresh_token || req.session.refresh_token
  }&grant_type=refresh_token`;
  res.send(tokenUrl);
  return;
  const data = await rp({
    uri: tokenUrl,
  });
});

app.get("/api/v1/strava/activities", async function (req, res) {
  const { token } = req.query;
  const data = await rp({
    uri: `${tulipApiUrl}/api/v1/user`,
    headers: {
      Authorization: req.session.strava_token || token,
    },
  });
  res.send(data);
});

app.get("/api/v1/tulip/getToken", async function (req, res) {
  res.send(req.session.tulip_token);
});

app.get("/api/v1/tulip/user", async (req, res) => {
  const { token } = req.query;
  const data = await rp({
    uri: `${tulipApiUrl}/api/v1/user`,
    headers: {
      Authorization: req.session.tulip_token || token,
    },
  });
  res.send(data);
});

app.get("/api/v1/tulip/feeds", async (req, res) => {
  let { token } = req.query;
  token = token || req.session.tulip_token;
  const result = await fetchFeeds(token);
  if (!result || result.length === 0) {
    return;
  }
  const activities = JSON.parse(result).msg;
  res.send(activities);
});

function fetchFeeds(token) {
  return new Promise((resolve, reject) => {
    try {
      const data = rp({
        uri: `${tulipApiUrl}/api/v1/feeds?start_time=2019-05-20&end_time=2020-09-20`,
        headers: {
          Authorization: token,
        },
      });
      if (data) {
        resolve(data);
      }
    } catch (err) {
      reject(err);
    }
  });
}

app.get("/api/v1/tulip/feeddetail", async (req, res) => {
  let { token } = req.query;
  const { activity_id } = req.query;
  const data = await rp({
    uri: `${tulipApiUrl}/api/v1/feeddetail`,
    qs: {
      activity_id,
    },
    headers: {
      Authorization: req.session.tulip_token || token,
    },
  });
  res.send(data);
});
/**
 * 生成向认证服务器申请认证的Url
 */
function getAuthurl() {
  return `${tulipApiUrl}/oauth2/authorize?scope=read_stream&redirect_uri=${redirectionUrl}&response_type=code&client_id=${ClientId}`;
}

function getTokenUrl(code, scope) {
  return `${tulipApiUrl}/oauth2/token?code=${code}&redirect_uri=${redirectionUrl}&client_id=${ClientId}&scope=${scope}&client_secret=${ClientSecret}&grant_type=authorization_code`;
}

const server = app.listen(8081, function () {
  const host = server.address().address;
  const port = server.address().port;

  console.log("应用实例，访问地址为 http://%s:%s", host, port);
});
