const Koa = require('koa');
const KoaRouter = require('koa-router');
const path = require("path");
const serve = require('koa-static');
const render = require("koa-ejs");
const utilsEcom = require("./utils.js");

const models = require("./models.js");
const Category = models.category();
const Product = models.product();

const app = new Koa();
const router = new KoaRouter();

router.get("/products", async ctx => {
  await Category.findAll().then((categoriesv) => categories = categoriesv);

  let count = 0;

  await Product.findAndCountAll({
    where: {
      hide: false
    },
    limit: utilsEcom.PRODUCTS_PER_PAGE,
    offset: 0
  }
  ).then((productsv) => {products = productsv.rows; count = productsv.count});

  await ctx.render('product-list', {
    categories: categories,
    products: products,
    page: 1,
    lastPage: count,
    pages: utilsEcom.givePages(1, Math.ceil(count / utilsEcom.PRODUCTS_PER_PAGE))
  });
});

router.get("/products/:page", async ctx => {
  await Category.findAll().then((categoriesv) => categories = categoriesv);

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0 + (ctx.params.page - 1) * limit;
  let count = 0;

  await Product.findAndCountAll({
    where: {
      hide: false
    },
    limit: limit,
    offset: offset
  }
  ).then((productsv) => {products = productsv.rows; count = productsv.count});

  await ctx.render('product-list', {
    categories: categories,
    products: products,
    page: parseInt(ctx.params.page),
    lastPage: count,
    pages: utilsEcom.givePages(parseInt(ctx.params.page), Math.ceil(count / utilsEcom.PRODUCTS_PER_PAGE))
  });
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