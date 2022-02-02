const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaBodyParser = require('koa-bodyparser');
const path = require("path");
const serve = require('koa-static');
const render = require("koa-ejs");
const utilsEcom = require("./utils.js");
const session = require('koa-session');

require('dotenv').config();

const { Sequelize } = require("sequelize");
const Op = Sequelize.Op;

const models = require("./models.js");
const Category = models.category();
const Product = models.product();
const User = models.user();
const Session = models.session();

const app = new Koa();
const router = new KoaRouter();

app.keys = [process.env.COOKIE_SECRET];

// Router functions
async function getIndex(ctx) {
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
    messages: ctx.session.messages
  });

  // Remove the message
  ctx.session.messages = null;
}
async function getProducts(ctx) {
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

  let categories, products, page = 1;
  await Category.findAll().then((categoriesv) => categories = categoriesv);

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let count = 0;

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
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
    ctx.session.messages = messages;
    await ctx.render('register')
  } 
  else 
  {
    // Send email
    let token = utilsEcom.generateEmailVerfToken();

    utilsEcom.sendEmail(ctx.request.body.email, token);

    User.create({
      username: ctx.request.body.username,
      email: ctx.request.body.email,
      password: ctx.request.body.password1,
      firstName: ctx.request.body.first,
      lastName: ctx.request.body.last,
      address: ctx.request.body.address,
      country: ctx.request.body.country,
      verificationToken: token,
    });
  
    let messages = {'registerSuccess': 'Please validate your e-mail!'};
    ctx.redirect('/')
  }
});

router.get('/verify_account/:token', async ctx => {
  let token = ctx.params.token;
  let ok = false;

  await User.findOne({
    where: {
      verificationToken: token,
      emailConfirmed: false
    }
  }).then(async (userv) => {
    if(userv == null)
      return;

    await userv.set({emailConfirmed: true});
    await userv.save();

    ok = true;
  });

  if(ok) {
    let messages = {'registerSuccess': 'Your email is validated!'};
    ctx.session.messages = messages;
    ctx.redirect('/')
  } else {
    let messages = {'verfError': 'Invalid token!'};
    ctx.session.messages = messages;
    ctx.redirect('/')
  }
});

router.post("/login", async ctx => {
  let ok = false, auth = false;

  await User.findOne({
    where: {
      username = ctx.request.username
    }
  }).then(async userv => {
    if(userv == null)
      return;

      ok = true;
  });

  if(ok) 
  {
    // User is found
    if(auth) 
    {
      let messages = {'loginSuccess': 'Successful login!'};
      ctx.session.messages = messages;
      ctx.session.login = utilsEcom.generateSessionKey();

      Session.create({key: ctx.session.login, expirationDate: })
      ctx.redirect('/')
    }
  }
  else 
  {
    // User not found
    let messages = {'loginError': 'User not found!'};
    ctx.session.messages = messages;
    ctx.redirect('/')
  }
});

render(app, {
  root: path.join(__dirname, "templates"),
  layout: "base",
  viewExt: "html",
  cache: false,
  debug: false,
});

app.use(session({
  key: process.env.COOKIE_SECRET,
  maxAge: 2 * 7 * 24 * 60 * 60 * 1000, // 2 weeks
  renew: true
}, app));

app.use(serve('./static'));

app.use(KoaBodyParser())

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);