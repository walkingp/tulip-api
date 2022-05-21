const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 30,
    },
  })
);

app.use(express.static(__dirname));

//this is the base route
app.get("/", async function (req, res) {
  res.send(`View more on https://luwan.vercel.app/`);
});
app.get("/tulip_bindok.html", async function (req, res) {
  const data = fs.readFileSync(__dirname + "/assets/tulip_bindok.html");
  const html = data.toString().replace("$$$$", "test");
  res.set("Content-Type", "text/html");
  res.send(html);
});
app.get("/.well-known/pki-validation/fileauth.txt", async function (req, res) {
  res.send("202010011352470e6j0043sgasfqeb8s8z2qifzm5pxauvb95p2371jgm7zr7tje");
});
// app.get("/mHWu41fGmo.txt", async function (req, res) {
//   res.send("27a58a497641148b3232d9006647f5ca");
// });

const tulip = require("./routes/tulip");
const strava = require("./routes/strava");
const spider = require("./routes/spider");
const wechat = require("./routes/wechat");

app.use("/api/v1/tulip", tulip);
app.use("/api/v1/strava", strava);
app.use("/api/v1/spider", spider);
app.use("/api/v1/wechat", wechat);

const server = app.listen(80, "0.0.0.0", function () {
  const host = server.address().address;
  const port = server.address().port;

  console.log("Server started, please open http://%s:%s", host, port);
});
