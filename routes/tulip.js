const express = require("express");
const { tulip, weapp } = require("../config/config");
const router = express.Router();
const querystring = require("querystring");
const fs = require("fs");
const path = require("path");
const rp = require("request-promise");

const tcb = require("@cloudbase/node-sdk");
const app = tcb.init(weapp);
const db = app.database();

router.get("/", async function (req, res) {
  const { redirect_uri, client_id, client_secret } = tulip;
  const params = {
    scope: "read_stream",
    redirect_uri,
    response_type: "code",
    client_id,
  };
  const qs = querystring.stringify(params);
  const url = `${tulip.apiUrl}/oauth2/authorize?${qs}`;
  res.send(`<a href=${url}>Authorize Tulip App</a>`);
});

router.get("/callback", async function (req, res) {
  const { code, scope, userId } = req.query;

  const { redirect_uri, apiUrl, client_id, client_secret } = tulip;
  const params = {
    code,
    redirect_uri,
    client_id,
    scope,
    client_secret,
    grant_type: "authorization_code",
  };
  const qs = querystring.stringify(params);
  const url = `${apiUrl}/oauth2/token?${qs}`;
  const tulip_token = await rp(url);
  const [access_token, token_type, expires_in, refresh_token] = Object.values(
    JSON.parse(tulip_token)
  );
  console.log("access_token", access_token);

  await db.collection("users").doc(userId).update({
    access_token,
  });

  req.session.tulip_token = access_token;
  const filePath = path.resolve(__dirname, "./../assets/tulip_bindok.html");
  const data = fs.readFileSync(filePath);
  const html = data
    .toString()
    .replace("$$$$", JSON.stringify(tulip_token).replace(/"/g, "'"));
  res.set("Content-Type", "text/html");
  console.log(html);
  res.send(html);
});

router.get("/getToken", async function (req, res) {
  res.send(req.session.tulip_token);
});

router.get("/user", async (req, res) => {
  const { token } = req.query;
  const data = await rp({
    uri: `${tulip.apiUrl}/api/v1/user`,
    headers: {
      Authorization: req.session.tulip_token || token,
    },
  });
  res.send(data);
});

router.get("/feeds", async (req, res) => {
  const { token } = req.query;
  const result = await rp({
    uri: `${tulip.apiUrl}/api/v1/feeds`,
    headers: {
      Authorization: req.session.tulip_token || token,
    },
  });

  if (!result || result.length === 0) {
    res.sendStatus(201);
  }

  res.send(result);
});

router.get("/feeddetail", async (req, res) => {
  const { token } = req.query;
  const result = await rp({
    uri: `${tulip.apiUrl}/api/v1/feeddetail`,
    headers: {
      Authorization: req.session.tulip_token || token,
    },
  });

  if (!result) {
    res.sendStatus(201);
  }

  res.send(result);
});

module.exports = router;
