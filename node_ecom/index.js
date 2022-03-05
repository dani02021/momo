require('dotenv').config();

const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaBodyParser = require('koa-better-body');
const path = require('path');
const serve = require('koa-static');
const render = require("koa-ejs");
const utilsEcom = require("./utils.js");
const session = require('koa-session');

const fs = require('fs');
const mv = require('mv');

const { Sequelize } = require("sequelize");
const Op = Sequelize.Op;

const models = require("./models.js");
const Category = models.category();
const Product = models.product();
const User = models.user();
const Staff = models.staff();
const Session = models.session();
const Role = models.role();
const Permission = models.permission();
const Order = models.order();
const OrderItem = models.orderitem();
const Transaction = models.transaction();
const PayPalTransaction = models.paypaltransacion();
const CODTransaction = models.codtransaction();

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
  ).then((productsv) => { products = productsv });

  await ctx.render('index', {
    selected: 'home',
    categories: categories,
    products: products,
    session: ctx.session,
  });

  // Remove the message
  ctx.session.messages = null;
}

async function getProducts(ctx) {
  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.cat) {
    filters['cat'] = ctx.query.cat
    filtersToReturn['Category'] = ctx.query.cat
  }
  if (ctx.query.minval) {
    filters['minval'] = ctx.query.minval
    filtersToReturn['Min price'] = ctx.query.minval
  }
  else {
    filters['minval'] = 0
  }
  if (ctx.query.maxval) {
    filters['maxval'] = ctx.query.maxval
    filtersToReturn['Max price'] = ctx.query.maxval
  }
  else {
    filters['maxval'] = 99999
  }
  if (ctx.query.search) {
    filters['search'] = ctx.query.search
    filtersToReturn['Search'] = ctx.query.search
  }
  else {
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
    name: { [Op.iLike]: `%${filters.search}%` },
    discountPrice: { [Op.gte]: filters.minval },
    discountPrice: { [Op.lte]: filters.maxval },
  }

  if (filters.cat)
    whereParam['categoryId'] = filters.cat

  await Product.findAndCountAll({
    where: whereParam,
    limit: limit,
    offset: offset
  }).then((productsv) => { products = productsv.rows; count = productsv.count });

  await ctx.render('product-list', {
    selected: 'products',
    session: ctx.session,
    categories: categories,
    products: products,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(count / utilsEcom.PRODUCTS_PER_PAGE)),
  });
}

async function getAdminProducts(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'products.read')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to see products' };
    await ctx.redirect('/admin');
    return;
  }

  // Get filters
  let filters = {}, filtersToReturn = {}, permFound = false;

  if (ctx.query.category) {
    filters['category'] = ctx.query.category;
    filtersToReturn['category'] = ctx.query.category;
  }
  if (ctx.query.minprice) {
    filters['minprice'] = ctx.query.minprice;
    filtersToReturn['minprice'] = ctx.query.minprice;
  }
  else {
    filters['minprice'] = 0;
  }
  if (ctx.query.maxprice) {
    filters['maxprice'] = ctx.query.maxprice;
    filtersToReturn['maxprice'] = ctx.query.maxprice;
  }
  else {
    filters['maxprice'] = 99999;
  }
  if (ctx.query.name) {
    filters['name'] = ctx.query.name;
    filtersToReturn['name'] = ctx.query.name;
  }
  else {
    filters['name'] = '';
  }

  let whereParam = {
    hide: false,
    name: { [Op.iLike]: `%${filters.name}%` },
    [Op.and]: [
      { discountPrice: { [Op.gte]: filters.minprice } },
      { discountPrice: { [Op.lte]: filters.maxprice } }
    ]
  }

  if (filters.category)
    whereParam['categoryId'] = filters.category

  let categories, products;
  await Category.findAll().then((categoriesv) => categories = categoriesv);

  // Paginator
  let page = 1;
  let count = 0;

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;
  if (ctx.params.page) {
    page = parseInt(ctx.params.page);
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  await Product.findAndCountAll({
    where: whereParam,
    limit: limit,
    offset: offset,
    order: [
      ['createdAt', 'DESC']
    ]
  }).then((productsv) => { products = productsv.rows; count = productsv.count });

  let categoriesNames = {};

  for (let i = 0; i < categories.length; i++) {
    categoriesNames[categories[i].id] = categories[i].name;
  }

  await ctx.render('/admin/products', {
    layout: '/admin/base',
    selected: 'products',
    session: ctx.session,
    products: products,
    categories: categories,
    categoriesNames: categoriesNames, // Find better way
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(count / utilsEcom.PRODUCTS_PER_PAGE))
  });

  // Clear old messages
  ctx.session.messages = null;
}

async function getAdminAccounts(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'accounts.read')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to see accounts' };
    await ctx.redirect('/admin');
    return;
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.user) {
    filters['user'] = ctx.query.user;
    filtersToReturn['user'] = ctx.query.user;
  } else {
    filters['user'] = '';
  }
  if (ctx.query.email) {
    filters['email'] = ctx.query.email;
    filtersToReturn['email'] = ctx.query.email;
  } else {
    filters['email'] = '';
  }
  if (ctx.query.country) {
    filters['country'] = ctx.query.country;
    filtersToReturn['country'] = ctx.query.country;
  } else {
    filters['country'] = '';
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  const result = await User.findAndCountAll({
    where: {
      username: { [Op.iLike]: `%${filters.user}%` },
      email: { [Op.iLike]: `%${filters.email}%` },
      country: { [Op.iLike]: `%${filters.country}%` },
    },
    limit: limit,
    offset: offset,
    order: [
      ['createdAt', 'DESC']
    ]
  });

  await ctx.render('admin/accounts', {
    layout: 'admin/base',
    selected: 'accounts',
    session: ctx.session,
    users: result.rows,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / utilsEcom.PRODUCTS_PER_PAGE))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminStaffs(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'staff.read')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to see staff' };
    await ctx.redirect('/admin');
    return;
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.user) {
    filters['user'] = ctx.query.user;
    filtersToReturn['user'] = ctx.query.user;
  } else {
    filters['user'] = '';
  }
  if (ctx.query.email) {
    filters['email'] = ctx.query.email;
    filtersToReturn['email'] = ctx.query.email;
  } else {
    filters['email'] = '';
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  const result = await Staff.findAndCountAll({
    where: {
      username: { [Op.iLike]: `%${filters.user}%` },
      email: { [Op.iLike]: `%${filters.email}%` },
    },
    limit: limit,
    offset: offset,
    order: [
      ['createdAt', 'DESC']
    ]
  });

  await ctx.render('admin/staff', {
    layout: 'admin/base',
    selected: 'staff',
    session: ctx.session,
    staff: result.rows,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / utilsEcom.PRODUCTS_PER_PAGE))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminRoles(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.read')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to see roles' };
    await ctx.redirect('/admin');
    return;
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  const result = await Role.findAndCountAll({
    limit: limit,
    offset: offset,
    order: [
      ['createdAt', 'DESC']
    ]
  });

  await ctx.render('admin/roles', {
    layout: 'admin/base',
    selected: 'roles',
    session: ctx.session,
    roles: result.rows,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / utilsEcom.PRODUCTS_PER_PAGE))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminOrders(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'orders.read')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to see orders' };
    await ctx.redirect('/admin');
    return;
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.user) {
    filters['user'] = ctx.query.user;
    filtersToReturn['user'] = ctx.query.user;
  } else {
    filters['user'] = '';
  }
  if (ctx.query.status) {
    filters['status'] = ctx.query.status;
    filtersToReturn['status'] = utilsEcom.STATUS_DISPLAY[ctx.query.status];
  } else {
    let stat = [];

    for(i = 0; i < utilsEcom.STATUS_DISPLAY.length; i++)
      stat.push(i);

    filters['status'] = stat;

    console.log(stat);
  }
  if (ctx.query.ordBefore) {
    filters['ordBefore'] = ctx.query.ordBefore;
    filtersToReturn['ordBefore'] = ctx.query.ordBefore;
  } else {
    filters['ordBefore'] = new Date();
  }
  if (ctx.query.ordAfter) {
    filters['ordAfter'] = ctx.query.ordAfter;
    filtersToReturn['ordAfter'] = ctx.query.ordAfter;
  } else {
    filters['ordAfter'] = new Date(0);
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  const result = await Order.findAndCountAll({
    where: {
      status: filters.status,
      orderedAt: {
        [Op.between]: [filters['ordAfter'], filters['ordBefore']]
      }
    },
    limit: limit,
    offset: offset,
    order: [
      ['createdAt', 'DESC']
    ],
    include: [{
      model: User,
      required: true,
      where: {
        'username': { [Op.iLike]: `%${filters.user}%` },
      }
    }],
  }).catch(function e(err) {console.log(err)});

  let users = []

  for(i = 0; i < result.rows.length; i++) 
  {
    users.push((await (result.rows[i].getUsers()))[0]);
  }

  await ctx.render("/admin/orders", {
    layout: "/admin/base",
    session: ctx.session,
    selected: "orders",
    orders: result.rows,
    statuses: utilsEcom.STATUS_DISPLAY,
    filters: filtersToReturn,
    users: users,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / utilsEcom.PRODUCTS_PER_PAGE))
  });

  // Clear the messages
  ctx.session.messages = null;
}

router.get("/", async ctx => getIndex(ctx));

router.get("/products", async ctx => getProducts(ctx));

router.get("/products/:page", async ctx => getProducts(ctx));

router.get("/register", async ctx => {
  await ctx.render('register', {
    selected: 'register',
    session: ctx.session,
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.post("/register", async ctx => {
  let unique = false;

  await User.findOne({
    where: {
      [Op.or]: [
        { email: ctx.request.fields.email },
        { username: ctx.request.fields.username }
      ]
    }
  }
  ).then((userv) => {
    if (userv === null || userv.length === 0)
      unique = true;
  }); // User already exists

  if (!unique) {
    let message = { 'userExists': 'User already exists with this email or username' }
    ctx.session.messages = message;
    ctx.redirect('/register');
  }
  else {
    // Send email
    let token = utilsEcom.generateEmailVerfToken();

    utilsEcom.sendEmail(ctx.request.fields.email, token);

    User.create({
      username: ctx.request.fields.username,
      email: ctx.request.fields.email,
      password: ctx.request.fields.password1,
      firstName: ctx.request.fields.first,
      lastName: ctx.request.fields.last,
      address: ctx.request.fields.address,
      country: ctx.request.fields.country,
      verificationToken: token,
    });

    let messages = { 'registerSuccess': 'Please validate your e-mail!' };
    ctx.redirect('/');
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
    if (userv == null)
      return;

    userv.set({ emailConfirmed: true });
    await userv.save();

    ok = true;
  });

  if (ok) {
    let messages = { 'registerSuccess': 'Your email is validated!' };
    ctx.session.messages = messages;
    ctx.redirect('/');
  } else {
    let messages = { 'verfError': 'Invalid token!' };
    ctx.session.messages = messages;
    ctx.redirect('/');
  }
});

router.post("/login", async ctx => {
  let userFound = false;

  await User.findOne({
    where: {
      username: ctx.request.fields.username
    }
  }).then(userv => {
    if (userv == null)
      return;

    if (userv.authenticate(ctx.request.fields.password)) {
      let messages = { 'loginSuccess': 'Successful login!' };
      ctx.session.messages = messages;
      ctx.session.username = ctx.request.fields.username;
      ctx.session.isStaff = false;

      userv.update({
        lastLogin: Sequelize.fn('NOW')
      });
    }
    else {
      let messages = { 'loginErrorPass': 'Wrong password!' };
      ctx.session.messages = messages;
    }

    userFound = true;
  });

  if (!userFound) {
    // User not found
    let messages = { 'loginErrorUser': 'User not found!' };
    ctx.session.messages = messages;
  }

  ctx.redirect('/');
});

router.get('/logout', async ctx => {
  ctx.session.messages = { 'logout': 'Log-out successful!' };
  ctx.session.username = null

  ctx.redirect('/')
});

router.get('/admin', async ctx => {
  if (await utilsEcom.isAuthenticatedStaff(ctx)) {
    const orders = await Order.findAll({
      order: [
        ['createdAt', 'DESC']
      ],
      limit: 10
    });

    let orderitems = []

    for (i = 0; i < orders.length; i++) {
      console.log(await orders[i].getOrderitems())
      orderitems.push(await orders[i].getOrderitems());
    }

    let users = []

    for (i = 0; i < orders.length; i++) {
      users.push((await orders[i].getUsers())[0]);
    }

    await ctx.render('/admin/index', {
      layout: "/admin/base",
      selected: 'dashboard',
      session: ctx.session,
      user: await Staff.findOne({ where: { username: ctx.session.dataValues.username } }),
      orders: orders,
      orderitems: orderitems,
      users: users,
      statusDisplay: utilsEcom.STATUS_DISPLAY
    });

    // Clear old messages
    ctx.session.messages = null;
  } else await ctx.redirect("/admin/login");
});

router.get('/admin/login', async ctx => {
  // Clear old messages
  ctx.session.messages = null;

  if (await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin');
  }
  else {
    await ctx.render('/admin/login', { layout: "/admin/base", selected: 'login', session: ctx.session });
  }
});

router.post('/admin/login', async ctx => {
  let userFound = false;

  await Staff.findOne({
    where: {
      username: ctx.request.fields.username
    }, include: Role
  }).then(async userv => {
    if (!userv)
      return;

    if (userv.authenticate(ctx.request.fields.password)) {
      let messages = { 'loginSuccess': 'Successful login!' };
      ctx.session.messages = messages;
      ctx.session.username = ctx.request.fields.username;
      ctx.session.isStaff = true;

      await userv.update({
        lastLogin: Sequelize.fn('NOW')
      });
    }
    else {
      let messages = { 'loginErrorPass': 'Wrong password!' };
      ctx.session.messages = messages;
    }

    userFound = true;
  });

  if (!userFound) {
    // User not found
    let messages = { 'loginErrorUser': 'User not found!' };
    ctx.session.messages = messages;
  }

  ctx.redirect('/admin');
});

router.get('/admin/logout', async ctx => {
  ctx.session.messages = { 'logout': 'Log-out successful!' };
  ctx.session.username = null

  ctx.redirect('/admin/login');
});

router.get('/admin/products', async ctx => getAdminProducts(ctx));
router.get('/admin/products/:page', async ctx => getAdminProducts(ctx));

router.post('/admin/products/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'product.create')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to create product' };
    await ctx.redirect('/admin/products');
    return;
  }

  let price = parseFloat(parseFloat(ctx.request.fields.price).toFixed(2));
  let discountPrice = parseFloat(parseFloat(ctx.request.fields.discountPrice).toFixed(2));

  if (price > 9999.99 || price < 0 || discountPrice > 9999.99 || discountPrice < 0) {
    ctx.session.messages = { 'productErrorPrice': 'Product has invalid price (0 - 9999.99)' };
    ctx.redirect('/admin/products/');
    return;
  }

  let defaultParams = {
    name: ctx.request.fields.name,
    price: price,
    discountPrice: discountPrice,
    quantity: ctx.request.fields.quantity,
    description: ctx.request.fields.description,
    categoryId: ctx.request.fields.category
  };

  if (ctx.request.fields.hide == 'on') {
    defaultParams.hide = true;
  } else {
    defaultParams.hide = false;
  }

  const [product, created] = await Product.findOrCreate({
    where: {
      name: ctx.request.fields.name
    },
    paranoid: false,
    defaults: defaultParams
  });

  if (!created) {
    if (!product.deletedAt) {
      ctx.session.messages = { 'productExist': `The product with name ${ctx.request.fields.name} already exists!` };
      ctx.redirect('/admin/products');
      return;
    } else {
      await product.restore();

      if (ctx.request.files.length && ctx.request.files[0].size != 0) {
        fs.renameSync(ctx.request.files[0].path + '', __dirname + '/static/media/id' + product.id + '/' + ctx.request.files[0].name, function (err) {
          if (err)
            throw err;
        });

        defaultParams.image = 'id' + product.id + '/' + ctx.request.files[0].name;
      }

      await product.update(defaultParams);
    }
  }
  else {
    if (ctx.request.files.length && ctx.request.files[0].size != 0) {
      fs.renameSync(ctx.request.files[0].path + '', __dirname + '/static/media/id' + product.id + '/' + ctx.request.files[0].name, function (err) {
        if (err)
          throw err;
      });

      await product.update({
        image: 'id' + product.id + '/' + ctx.request.files[0].name
      });
    }
    else {
      fs.mkdirSync(__dirname + '/static/media/id' + product.id);
    }
  }
  ctx.session.messages = { 'productCreated': `Product with id ${product.id} has been created!` };
  ctx.redirect('/admin/products');
});

router.get('/admin/products/edit/:id', async ctx => {
  let categories = {};

  await Category.findAll().then((categoriesv) => categories = categoriesv);

  await Product.findOne({
    where: {
      id: ctx.params.id
    }
  }).then(async product => {
    await ctx.render('admin/edit-product', {
      layout: 'admin/base',
      session: ctx.session,
      selected: 'products',
      product: product,
      categories: categories
    });
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.post('/admin/products/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'products.update')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to update a product' };
    await ctx.redirect('/admin/products');
    return;
  }

  // Check the values

  let price = parseFloat(parseFloat(ctx.request.fields.price).toFixed(2));
  let discountPrice = parseFloat(parseFloat(ctx.request.fields.discountPrice).toFixed(2));

  if (price > 9999.99 || price < 0 || discountPrice > 9999.99 || discountPrice < 0) {
    ctx.session.messages = { 'productErrorPrice': 'Product has invalid price (0 - 9999.99)' };
    ctx.redirect('/admin/products/edit/' + ctx.params.id);
    return;
  }

  let updateParams = {
    name: ctx.request.fields.name,
    price: price,
    discountPrice: discountPrice,
    quantity: ctx.request.fields.quantity,
    description: ctx.request.fields.description,
    categoryId: ctx.request.fields.category
  }

  // Upload the image
  if (ctx.request.files.length && ctx.request.files[0].size != 0) {
    fs.renameSync(ctx.request.files[0].path + '', __dirname + '/static/media/id' + ctx.params.id + '/' + ctx.request.files[0].name, function (err) {
      if (err)
        throw err;
    });

    updateParams.image = 'id' + ctx.params.id + '/' + ctx.request.files[0].name;
  }

  if (ctx.request.fields.hide == 'on') {
    updateParams.hide = true;
  } else {
    updateParams.hide = false;
  }

  await Product.update(updateParams,
    {
      where: {
        id: ctx.params.id
      }
    });

  ctx.session.messages = { 'productEdited': `Product with id ${ctx.params.id} was edited!` };
  await ctx.redirect('/admin/products/edit/' + ctx.params.id);
});

router.post('/admin/products/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'products.delete')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to delete a product' };
    await ctx.redirect('/admin/products');
    return;
  }

  ids = ctx.request.fields.id;

  await Product.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'productDeleted': 'Selected products have been deleted!' }

  ctx.redirect('/admin/products');
});

router.get('/product-detail/:id', async ctx => {
  const product = await Product.findOne({
    where: {
      id: ctx.params.id
    }
  });

  const categories = await Category.findAll();

  await ctx.render('product-detail', {
    session: ctx.session,
    selected: 'product-detail',
    product: product,
    categories: categories,
  });
});

router.get('/admin/accounts', async ctx => getAdminAccounts(ctx));
router.get('/admin/accounts/:page', async ctx => getAdminAccounts(ctx));

router.post('/admin/accounts/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'accounts.delete')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to delete a account' };
    await ctx.redirect('/admin/accounts');
    return;
  }

  ids = ctx.request.fields.id;

  await User.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'accountDeleted': 'Selected accounts have been deleted!' }

  ctx.redirect('/admin/accounts');
});

router.get('/admin/accounts/edit/:id', async ctx => {
  const user = await User.findOne({ where: { id: ctx.params.id } });

  await ctx.render('admin/edit-account', {
    layout: 'admin/base',
    session: ctx.session,
    selected: 'accounts',
    user: user
  });
});

router.post('/admin/accounts/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'accounts.update')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to update an account' };
    await ctx.redirect('/admin/accounts');
    return;
  }

  let updateParams = {
    username: ctx.request.fields.name,
    email: ctx.request.fields.email,
    address: ctx.request.fields.address,
    country: ctx.request.fields.country
  }

  if (ctx.request.fields.emailConfirmed == 'on') {
    updateParams.emailConfirmed = true;
  } else {
    updateParams.emailConfirmed = false;
  }

  await User.update(updateParams,
    {
      where: {
        id: ctx.params.id
      }
    }).catch(function (err) {
      console.log(err);
    });

  ctx.session.messages = { 'accountEdited': `User with id ${ctx.params.id} was edited!` }
  await ctx.redirect('/admin/accounts');
});

router.post('/admin/accounts/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'accounts.create')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to create an account' };
    await ctx.redirect('/admin/accounts');
    return;
  }

  let defaultParams = {
    username: ctx.request.fields.username,
    email: ctx.request.fields.email,
    password: ctx.request.fields.password,
    firstName: ctx.request.fields.firstname,
    lastName: ctx.request.fields.lastname,
    address: ctx.request.fields.address,
    country: ctx.request.fields.country,
    emailConfirmed: true
  };

  const [user, created] = await User.findOrCreate({
    where: {
      [Op.or]: [
        { email: ctx.request.fields.email },
        { username: ctx.request.fields.username }
      ]
    },
    paranoid: false,
    defaults: defaultParams
  });

  if (!created) {
    if (!user.deletedAt) {
      ctx.session.messages = { 'accountExist': `The user ${ctx.request.fields.username} already exists!` };
      ctx.redirect('/admin/accounts');
      return;
    } else {
      await user.restore();

      await user.update(defaultParams);
    }
  }
  ctx.session.messages = { 'accountCreated': `User with id ${user.id} has been created!` };
  ctx.redirect('/admin/accounts');
});

router.get('/admin/staff', async ctx => getAdminStaffs(ctx));
router.get('/admin/staff/:page', async ctx => getAdminStaffs(ctx));

router.post('/admin/staff/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'staff.update')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to create a staff' };
    await ctx.redirect('/admin/staff');
    return;
  }

  let defaultParams = {
    username: ctx.request.fields.username,
    email: ctx.request.fields.email,
    password: ctx.request.fields.password,
    firstName: ctx.request.fields.firstname,
    lastName: ctx.request.fields.lastname,
  };

  const [user, created] = await Staff.findOrCreate({
    where: {
      [Op.or]: [
        { email: ctx.request.fields.email },
        { username: ctx.request.fields.username }
      ]
    },
    paranoid: false,
    defaults: defaultParams
  });

  if (!created) {
    if (!user.deletedAt) {
      ctx.session.messages = { 'staffExist': `The staff ${ctx.request.fields.username} already exists!` };
      ctx.redirect('/admin/staff');
      return;
    } else {
      await user.restore();

      await user.update(defaultParams);
    }
  }
  ctx.session.messages = { 'staffCreated': `Staff with id ${user.id} has been created!` };
  ctx.redirect('/admin/staff');
});

router.post('/admin/staff/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'accounts.delete')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to delete staff' };
    await ctx.redirect('/admin/staff');
    return;
  }
  ids = ctx.request.fields.id;

  await Staff.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'staffDeleted': 'Selected staff are deleted!' }

  ctx.redirect('/admin/staff');
});

router.get('/admin/staff/edit/:id', async ctx => {
  const staff = await Staff.findOne({ where: { id: ctx.params.id } });
  const roles = await Role.findAll();
  const uroles = await staff.getRoles();

  await ctx.render('admin/edit-staff', {
    layout: 'admin/base',
    session: ctx.session,
    selected: 'staff',
    staff: staff,
    roles: roles,
    uroles: uroles,
  });
});

router.post('/admin/staff/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'staff.update')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to update staff' };
    await ctx.redirect('/admin/staff');
    return;
  }

  let updateParams = {
    username: ctx.request.fields.name,
    email: ctx.request.fields.email
  }

  const staff = await Staff.findOne({ where: { id: ctx.params.id } });

  staff.update(updateParams).catch(function (err) {
    console.log(err);
  });

  await staff.removeRoles(await staff.getRoles());

  if (ctx.request.fields.role instanceof Array) {
    for (roleid in ctx.request.fields.role) {
      const role = await Role.findOne({ where: { id: ctx.request.fields.role[roleid] } });
      await staff.addRole(role);
    }
  } else if (ctx.request.fields.role) {
    const role = await Role.findOne({ where: { id: ctx.request.fields.role } });
    await staff.addRole(role);
  }
  ctx.session.messages = { 'staffEdited': `Staff with id ${ctx.params.id} was edited!` }
  await ctx.redirect('/admin/staff/edit/' + ctx.params.id);
});

router.post('/admin/categories/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'categories.create')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to create a category' };
    await ctx.redirect('/admin/products');
    return;
  }

  const [category, created] = await Category.findOrCreate({
    where: {
      name: ctx.request.fields.name,
      imageCss: ctx.request.fields.image
    }
  });

  if (created) {
    ctx.session.messages = { 'categoryCreated': `Category with id ${ctx.params.id} has been created!` };
  }
  else {
    ctx.session.messages = { 'categoryExist': `Category with id ${ctx.params.id} already exists!` };
  }

  await ctx.redirect('/admin/products')
});

router.post('/admin/categories/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'categories.delete')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to delete a category' };
    await ctx.redirect('/admin/products');
    return;
  }

  await Category.destroy({
    where: {
      id: ctx.request.fields.id
    }
  });

  ctx.session.messages = { 'categoryDeleted': `Selected categories have been deleted!` };
  await ctx.redirect('/admin/products');
});

router.post('/admin/roles/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.create')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to create a role' };
    await ctx.redirect('/admin/roles');
    return;
  }

  const [role, created] = await Role.findOrCreate({
    where: {
      name: ctx.request.fields.role,
    },
    include: Permission
  });

  if (ctx.request.fields.permissions instanceof Array) {
    for (permid in ctx.request.fields.permissions) {
      const permission = await Permission.findOne({ where: { id: ctx.request.fields.permissions[permid] } });
      await role.addPermission(permission);
    }
  }
  else if (ctx.request.fields.permissions) {
    await role.addPermission(await Permission.findOne({ where: { id: ctx.request.fields.permissions } }));
  }

  if (created) {
    ctx.session.messages = { 'roleCreated': `Role with id ${ctx.params.id} has been created!` };
  }
  else {
    ctx.session.messages = { 'roleExist': `Role with id ${ctx.params.id} already exists!` };
  }

  await ctx.redirect('/admin/roles');
});

router.post('/admin/roles/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.delete')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to delete a role' };
    await ctx.redirect('/admin/roles');
    return;
  }

  await Role.destroy({
    where: {
      id: ctx.request.fields.id
    }
  });
  ctx.session.messages = { 'roleDeleted': 'Selected roles are deleted!' }

  await ctx.redirect('/admin/roles');
});

router.get('/admin/roles/edit/:id', async ctx => {
  const role = await Role.findOne({ where: { id: ctx.params.id } });
  const permissions = await role.getPermissions();

  await ctx.render('admin/edit-role', {
    layout: 'admin/base',
    selected: 'roles',
    session: ctx.session,
    role: role,
    permissions: permissions,
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.post('/admin/roles/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.update')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to update a role' };
    await ctx.redirect('/admin/roles');
    return;
  }

  const role = await Role.findOne({
    where: {
      name: ctx.request.fields.role,
    },
    include: Permission
  });

  await role.removePermissions(await role.getPermissions());

  if (ctx.request.fields.permissions instanceof Array) {
    for (permid in ctx.request.fields.permissions) {
      const permission = await Permission.findOne({ where: { id: ctx.request.fields.permissions[permid] } });
      await role.addPermission(permission);
    }
  }
  else if (ctx.request.fields.permissions) {
    await role.addPermission(await Permission.findOne({ where: { id: ctx.request.fields.permissions } }));
  }

  ctx.session.messages = { 'roleEdited': `Role with id ${ctx.params.id} was edited!` };
  await ctx.redirect('/admin/roles');
});

router.get('/admin/roles', async ctx => getAdminRoles(ctx));
router.get('/admin/roles/:page', async ctx => getAdminRoles(ctx));

// Getters
router.get('/api/permissions/get', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    return;
  }

  ctx.body = JSON.stringify(await Permission.findAll({
    attributes: ['id', ['name', 'value']],
    where: {
      name: { [Op.iLike]: `%${ctx.request.query.term}%` },
    }
  }));
});

router.get('/api/accounts/get', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    return;
  }

  ctx.body = JSON.stringify(await User.findAll({
    attributes: ['id', ['username', 'value']],
    where: {
      username: { [Op.iLike]: `%${ctx.request.query.term}%` },
    }
  }));
});

router.get('/api/products/get', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    return;
  }

  ctx.body = JSON.stringify(await Product.findAll({
    attributes: ['id', ['name', 'value']],
    where: {
      name: { [Op.iLike]: `%${ctx.request.query.term}%` },
    }
  }));
});

router.get('/admin/orders', async ctx => getAdminOrders(ctx));
router.get('/admin/orders/:page', async ctx => getAdminOrders(ctx));

router.post('/admin/orders/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'orders.create')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to create order' };
    await ctx.redirect('/admin/orders');
    return;
  }

  let items = ctx.request.fields.items;

  let order = await Order.create({
    status: ctx.request.fields.status,
    orderedAt: Sequelize.fn('NOW'),
  });

  if(items instanceof Array) 
  {
    for(i = 0; i < items.length; i++) 
    {
      let orderitem = await OrderItem.create({ quantity: parseInt(items[i].split(" ")[1]) });
      let product = await Product.findOne({where: {id: parseInt(items[i].split(" ")[0])}});
      await orderitem.setProduct(product);

      await order.addOrderitem(orderitem);
    }
  } 
  else 
  {
    let orderitem = await OrderItem.create({ quantity: parseInt(items.split(" ")[1]) });
    let product = await Product.findOne({where: {id: parseInt(items.split(" ")[0])}});
    await orderitem.setProduct(product);

    await order.addOrderitem(orderitem);
  }

  order.update({price: await order.getTotal()});

  let user = await User.findOne({
    where: {
      username: ctx.request.fields.user
    }
  });

  await user.addOrder(order);

  await utilsEcom.removeProductQtyFromOrder(order);

  ctx.session.messages = {'orderCreated': 'Order created!'};
  await ctx.redirect('/admin/orders');
});

router.post('/admin/orders/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    await ctx.redirect('/admin/login');
  }

  if (!await utilsEcom.hasPermission(ctx, 'orders.delete')) {
    ctx.session.messages = { 'noPermission': 'You don\'t have permission to delete a order' };
    await ctx.redirect('/admin/orders');
    return;
  }

  ids = ctx.request.fields.id;

  if(ids instanceof Array) 
  {
    for(i = 0; i < ids.length; i++) 
    {
      utilsEcom.addProductQtyFromOrder(await Order.findOne({where: {id: ids[i]}}));
    }
  } else {
    utilsEcom.addProductQtyFromOrder(await Order.findOne({where: {id: ids}}));
  }

  await Order.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'orderDeleted': 'Selected orders have been deleted!' }

  ctx.redirect('/admin/orders');
});

router.get('/admin/orders/edit/:id', async ctx => {
  const order = await Order.findOne({
    where: {
      id: ctx.params.id
    }
  });

  let orderitems = await order.getOrderitems();

  let products = [];

  for (i = 0; i < orderitems.length; i++) {
    await products.push(await (orderitems[i].getProduct()));
  }

  let user = (await (order.getUsers()))[0];

  await ctx.render('admin/edit-order', {
    layout: 'admin/base',
    session: ctx.session,
    selected: 'orders',
    order: order,
    orderitems: orderitems,
    products: products,
    user: user,
    statuses: utilsEcom.STATUS_DISPLAY
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.post('/admin/orders/edit/:id', async ctx => {
  const order = await Order.findOne({
    where: {
      id: ctx.params.id
    }
  });

  // Remove orderitems from the order
  await utilsEcom.addProductQtyFromOrder(order);

  let orderitems = await order.getOrderitems();

  for (i = 0; i < orderitems.length; i++) 
  {
    await orderitems[i].destroy();
  }

  // Add new orderitems to the order
  if (ctx.request.fields.items instanceof Array) 
  {
    for (i = 0; i < ctx.request.fields.items.length; i++) 
    {
      let product = await Product.findOne({where: {id: ctx.request.fields.items[i].split(", ")[0]}});
      let orderitem = await OrderItem.create({quantity: ctx.request.fields.items[i].split(", ")[1]});
      await orderitem.setProduct(product);

      await order.addOrderitem(orderitem);
    }
  } 
  else 
  {
    let product = await Product.findOne({where: {id: ctx.request.fields.items.split(", ")[0]}});
    let orderitem = await OrderItem.create({quantity: ctx.request.fields.items.split(", ")[1]});
    await orderitem.setProduct(product);

    await order.addOrderitem(orderitem);
  }

  await utilsEcom.removeProductQtyFromOrder(order);

  // Update status, price and orderedAt
  await order.update({
    status: ctx.request.fields.status,
    price: await order.getTotal(),
    orderedAt: ctx.request.fields.orderedDate
  });

  // Set the new user
  await order.removeUsers(await order.getUsers());
  await order.addUser(await User.findOne({where: {username: ctx.request.fields.user}}));

  ctx.session.messages = {'orderEdited': `Order with id ${ctx.params.id} has been updated!`};
  await ctx.redirect('/admin/orders');
});

router.get('/addToCart', async ctx => {
  // Currently working only for registered users
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    ctx.session.messages = { 'noPermission': 'You are not registered!' };
    await ctx.redirect('/');
    return;
  }

  const user = await User.findOne({ where: { username: ctx.session.dataValues.username } });

  const [order, createdorder] = await Order.findOrCreate({
    where: {
      status: 0
    },
    include: [{
      model: User,
      required: true,
      where: {
        'username': ctx.session.dataValues.username
      }
    }],
    paranoid: false,
    defaults: {}
  });

  const [orderitem, createdorderitem] = await OrderItem.findOrCreate({
    where: {
      productId: ctx.query.id
    },
    include: [{
      model: Order,
      required: true,
      where: {
        id: order.id
      }
    }],
    defaults: {
      productId: ctx.query.id,
      quantity: ctx.query.quantity,
    }
  });

  if (createdorderitem)
    await order.addOrderitem(orderitem);
  else {
    orderitem.update({
      quantity: parseInt(orderitem.quantity) + parseInt(ctx.query.quantity)
    });
  }
  if (createdorder)
    await user.addOrder(order);

  if (ctx.query.isCart) {
    ctx.session.messages = { 'productAdded': 'Product added to cart!' };
    await ctx.redirect('/products');
  }
  else {
    await ctx.redirect('/cart');
  }
});

router.get('/removeFromCart', async ctx => {
  // Currently working only for registered users
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    ctx.session.messages = { 'noPermission': 'You are not registered!' };
    await ctx.redirect('/');
    return;
  }

  const quantity = ctx.query.quantity;

  const orderitem = await OrderItem.findOne({
    where: {
      id: ctx.query.orderid
    }
  });

  if (quantity > 0) {
    await orderitem.update({
      quantity: parseInt(orderitem.quantity) - parseInt(quantity)
    });
  }
  else {
    await orderitem.destroy();
  }

  ctx.session.messages = { 'cartRemoved': 'Removed selected items from the cart' };

  await ctx.redirect('/cart');
});

router.get('/cart', async ctx => {
  // Currently working only for registered users
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    ctx.session.messages = { 'noPermission': 'You are not registered!' };
    await ctx.redirect('/');
    return;
  }

  const order = await Order.findOne({
    where: {
      status: 0,
    },
    include: [{
      model: User,
      required: true,
      where: {
        'username': ctx.session.dataValues.username
      }
    }],
  });

  if (order == null)
    orderitems = [];
  else orderitems = await order.getOrderitems();

  let products = [];

  for (i = 0; i < orderitems.length; i++) {
    await products.push(await (orderitems[i].getProduct()));
  }

  let totals = [];

  for (i = 0; i < orderitems.length; i++) {
    await totals.push(await (orderitems[i].getTotal()));
  }

  let orderTotal = (totals.reduce((partialSum, a) => partialSum + a, 0)).toFixed(2);

  await ctx.render('cart', {
    session: ctx.session,
    selected: 'cart',
    items: orderitems,
    products: products,
    totals: totals,
    orderTotal: orderTotal,
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.get('/checkout', async ctx => {
  // Currently working only for registered users
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    ctx.session.messages = { 'noPermission': 'You are not registered!' };
    await ctx.redirect('/');
    return;
  }

  const user = await User.findOne({
    where: {
      username: ctx.session.dataValues.username
    }
  });

  const order = await Order.findOne({
    where: {
      status: 0,
    },
    include: [{
      model: User,
      required: true,
      where: {
        'username': ctx.session.dataValues.username
      }
    }],
  });

  if (order == null) {
    ctx.redirect('/');
    return;
  }

  orderitems = await order.getOrderitems();

  let products = [];

  for (i = 0; i < orderitems.length; i++) {
    await products.push(await (orderitems[i].getProduct()));
  }

  let totals = [];

  for (i = 0; i < orderitems.length; i++) {
    await totals.push(await (orderitems[i].getTotal()));
  }

  let orderTotal = (totals.reduce((partialSum, a) => partialSum + a, 0)).toFixed(2);

  await ctx.render('checkout', {
    session: ctx.session,
    selected: 'checkout',
    user: user,
    items: orderitems,
    products: products,
    totals: totals,
    orderTotal: orderTotal
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.post('/captureOrder', async ctx => {
  const order = await Order.findOne({
    where: {
      status: 0,
    },
    include: [{
      model: User,
      required: true,
      where: {
        'username': ctx.session.dataValues.username
      }
    }],
  });

  if (!order) {
    ctx.redirect('/');
    return;
  }

  // Check if products have enough quantity
  const orderitems = await order.getOrderitems();
  for (i = 0; i < orderitems.length; i++) {
    let product = await orderitems[i].getProduct();
    if (product.quantity < orderitems[i].quantity) {
      ctx.body = { 'msg': 'There is no enough quantity of ' + product.name, 'status': 'error' };
      return;
    }
  }

  const transaction = await Transaction.create({ type: ctx.request.fields.type });

  if (ctx.request.fields.type == "paypal") {
    let responce = await utilsEcom.captureOrder(ctx.request.fields.orderID);

    await transaction.createPaypaltransacion({
      transactionId: responce.result.id,
      orderId: responce.result.purchase_units[0].payments.captures[0].id,
      status: responce.result.status,
      emailAddress: responce.result.payer.email_address,
      firstName: responce.result.payer.name.given_name,
      lastName: responce.result.payer.name.surname,
      grossAmount: responce.result.purchase_units[0].payments.captures[0].seller_receivable_breakdown.gross_amount.value,
      paypalFee: responce.result.purchase_units[0].payments.captures[0].seller_receivable_breakdown.paypal_fee.value,
    });

    await utilsEcom.validateStatus(ctx, null, responce);
  } else {
    await transaction.createCodtransaction({

    });

    const user = await User.findOne({
      where: {
        username: ctx.session.dataValues.username
      }
    });

    const cart = await Order.findOne({
      where: {
        status: 0,
      },
      include: [{
        model: User,
        required: true,
        where: {
          'username': ctx.session.dataValues.username
        }
      }],
    });

    if (!cart) {
      ctx.redirect('/');
      return;
    }

    await cart.update({ status: 1, orderedAt: Sequelize.fn('NOW'), price: await cart.getTotal() });

    await utilsEcom.removeProductQtyFromOrder(cart);

    // ctx.body = {'msg': 'Your order is completed!', 'status': 'ok'};
    ctx.redirect('/');
  }

  await order.setTransacion(transaction);
});

router.get('/admin/report', async ctx => {
  await ctx.render('/admin/report', {
    layout: '/admin/base',
    selected: 'report',
    session: ctx.session
  });
});

render(app, {
  root: path.join(__dirname, "templates"),
  layout: "base",
  viewExt: "html",
  cache: false,
  debug: false,
});

app.use(session({
  store: utilsEcom.configPostgreSessions(),
  key: process.env.COOKIE_SECRET,
  maxAge: utilsEcom.SESSION_MAX_AGE, // 2 weeks
  renew: true
}, app));

app.use(serve('./static'));

app.use(KoaBodyParser())

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);