const Koa = require('koa');
const KoaRouter = require('koa-router');
const path = require("path");
const serve = require('koa-static');
const render = require("koa-ejs");

const models = require("./models.js"); 

const app = new Koa();
const router = new KoaRouter();

router.get("/products", async ctx => {
  ctx.body = 'Products here!'
});

router.get("/products/:page", async ctx => {
  ctx.body = ctx.params
});

render(app, {
  root: path.join(__dirname, "templates"),
  layout: "base",
  viewExt: "html",
  cache: false,
  debug: false,
});

app.use(serve('./static'));

router.get("/", async ctx => {
  await ctx.render('index')
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);