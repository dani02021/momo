const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaBodyParser = require('koa-bodyparser');
const path = require("path");
const serve = require('koa-static');
const render = require("koa-ejs");
const utilsEcom = require("./utils.js");

const { Sequelize } = require("sequelize");
const Op = Sequelize.Op;

const models = require("./models.js");
const Category = models.category();
const Product = models.product();
const User = models.user();

const app = new Koa();
const router = new KoaRouter();

// Router functions
async function getIndex(ctx, messages) {
  let categories, products;

  await Category.findAll().then((categoriesv) => categories = categoriesv);

  await Product.findAll({
    where: {
      hide: false
    }, order: [
      ['createdAt', 'DESC']
    ],
    limit: 10
  }
  ).then((productsv) => {products = productsv});

  await ctx.render('index', {
    categories: categories,
    products: products,
    messages: messages
  })
}
async function getProducts(ctx, messages) {
  // Get filters
  let filters = {}, filtersToReturn = {};

  if(ctx.query.cat) 
  {
    filters['cat'] = ctx.query.cat
    filtersToReturn['Category'] = ctx.query.cat
  }
  if(ctx.query.minval) 
  {
    filters['minval'] = ctx.query.minval
    filtersToReturn['Min price'] = ctx.query.minval
  }
  else 
  {
    filters['minval'] = 0
  }
  if(ctx.query.maxval) 
  {
    filters['maxval'] = ctx.query.maxval
    filtersToReturn['Max price'] = ctx.query.maxval
  }
  else 
  {
    filters['maxval'] = 99999
  }
  if(ctx.query.search) 
  {
    filters['search'] = ctx.query.search
    filtersToReturn['Search'] = ctx.query.search
  }
  else 
  {
    filters['search'] = ''
  }

  let categories, products, page;
  await Category.findAll().then((categoriesv) => categories = categoriesv);

  if (ctx.params.page) {
    page = ctx.params.page
  }

  let count = 0;

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;

  if (ctx.params.page) {
    let offset = (ctx.params.page - 1) * limit;
  }


  let whereParam = {
    hide: false,
    name: {[Op.iLike]: `%${filters.search}%`},
    discountPrice: {[Op.gte]: filters.minval},
    discountPrice: {[Op.lte]: filters.maxval},
  }

  if (filters.cat)
    whereParam['categoryId'] = filters.cat

    await Product.findAndCountAll({
      where: whereParam,
      limit: limit,
      offset: offset
    }
    ).then((productsv) => {products = productsv.rows; count = productsv.count});

  await ctx.render('product-list', {
    categories: categories,
    products: products,
    filters: filtersToReturn,
    page: page,
    lastPage: count,
    pages: utilsEcom.givePages(page, Math.ceil(count / utilsEcom.PRODUCTS_PER_PAGE))
  });
}

router.get("/", async ctx => getIndex(ctx, null));

router.get("/products", async ctx => getProducts(ctx, null));

router.get("/products/:page", async ctx => getProducts(ctx, null));

router.get("/register", async ctx => {
  await ctx.render('register')
});

router.post("/register", async ctx => {
  let unique = false;

  await User.findOne({
    where: {
      [Op.or]: [
        { email: ctx.request.body.email },
        { username: ctx.request.body.username }
      ]
    }
  }
  ).then((userv) => {if(userv === null || userv.length === 0) unique = true;}); // User already exists

  if(!unique) 
  {
    let message = {'userExists': 'User already exists with this email or username'}
    await ctx.render('register', {messages: message})
  } else 
  {
    User.create({
      username: ctx.request.body.username,
      email: ctx.request.body.email,
      password: ctx.request.body.password1,
      firstName: ctx.request.body.first,
      lastName: ctx.request.body.last,
      address: ctx.request.body.address,
      country: ctx.request.body.country,
    });
  
    let messages = {'registerSuccess': 'Please validate your e-mail'}
    await getIndex(ctx, messages)
  }
})

render(app, {
  root: path.join(__dirname, "templates"),
  layout: "base",
  viewExt: "html",
  cache: false,
  debug: false,
});

app.use(serve('./static'));

app.use(KoaBodyParser())

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);