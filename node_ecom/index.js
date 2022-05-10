require('dotenv').config();

const http = require("http");
const https = require("https");
const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaBodyParser = require('koa-better-body');
const path = require('path');
const serve = require('koa-static');
const render = require("koa-ejs");
const utilsEcom = require("./utils.js");
const configEcom = require("./config.js");
const session = require('koa-session');
const assert = require('assert/strict');
const csv = require('fast-csv');

const fs = require('fs');
const db = require("./db.js");

const { Sequelize, ValidationError } = require("sequelize");
const Op = Sequelize.Op;

const models = require("./models.js");
const { parse } = require('path');
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
const Log = models.log();
const Settings = models.settings();

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

  let cartQty = await utilsEcom.getCartQuantity(ctx);

  await ctx.render('index', {
    selected: 'home',
    cartQty: cartQty,
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
  } else {
    filters['cat'] = '';
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

  let categories, page = 1;
  await Category.findAll().then((categoriesv) => categories = categoriesv);

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  let [products, count] = await utilsEcom.getProductsAndCountRaw(offset, limit, filters.search, filters.cat, filters.minval, filters.maxval, ctx.query.sort);

  let cartQty = await utilsEcom.getCartQuantity(ctx);

  await ctx.render('product-list', {
    selected: 'products',
    session: ctx.session,
    cartQty: cartQty,
    categories: categories,
    products: await products,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil((await count)[0].dataValues.count / configEcom.SETTINGS["elements_per_page"]))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getMyAccount(ctx) {
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    utilsEcom.onNotAuthenticatedUser(ctx);
    return;
  }

  let cartQty = await utilsEcom.getCartQuantity(ctx);

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  let result = await Order.findAndCountAll({
    where: {
      status: { [Op.gte]: 1 },
    },
    limit: limit,
    offset: offset,
    include: [{
      model: User,
      required: true,
      where: {
        'username': ctx.session.dataValues.username
      }
    }],
    order: [
      ['orderedAt', 'DESC']
    ]
  });

  let currency = await utilsEcom.getCurrency();

  await ctx.render('my-account', {
    selected: 'my-account',
    session: ctx.session,
    cartQty: cartQty,
    orders: result.rows,
    currency: currency,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / configEcom.SETTINGS["elements_per_page"])),
    statuses: configEcom.STATUS_DISPLAY
  });

  // Clear old messages
  ctx.session.messages = null;
}

async function getAdminProducts(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  if (!await utilsEcom.hasPermission(ctx, "products.read")) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see products",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see products without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

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

  const categories = await Category.findAll();

  // Paginator
  let page = 1;

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;
  if (ctx.params.page) {
    page = parseInt(ctx.params.page);
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  let categoriesNames = {};

  for (let i = 0; i < categories.length; i++) {
    categoriesNames[categories[i].id] = categories[i].name;
  }

  let [products, count] = await utilsEcom.getProductsAndCountRaw(offset, limit, filters.name, filters.category, filters.minprice, filters.maxprice);

  let cartQty = await utilsEcom.getCartQuantity(ctx);

  await ctx.render('/admin/products', {
    layout: '/admin/base',
    selected: 'products',
    session: ctx.session,
    cartQty: cartQty,
    products: await products,
    categories: categories,
    categoriesNames: categoriesNames, // Find better way
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil((await count)[0].dataValues.count / configEcom.SETTINGS["elements_per_page"]))
  });

  // Clear old messages
  ctx.session.messages = null;
}

async function getAdminAccounts(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  if (!await utilsEcom.hasPermission(ctx, 'accounts.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see accounts",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see accounts without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
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

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  let result = await db.query(`SELECT * FROM users 
    WHERE position(upper($1) in upper(username)) > 0
    AND position(upper($2) in upper(email)) > 0
    AND position(upper($3) in upper(country)) > 0
    AND "deletedAt" is NULL
    ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`, {
    type: 'SELECT',
    plain: false,
    model: User,
    mapToModel: true,
    bind: [filters.user, filters.email, filters.country]
  });

  let count = await db.query(`SELECT COUNT(*) FROM users
    WHERE position(upper($1) in upper(username)) > 0
    AND position(upper($2) in upper(email)) > 0
    AND position(upper($3) in upper(country)) > 0
    AND "deletedAt" is NULL`, {
    type: 'SELECT',
    plain: true,
    bind: [filters.user, filters.email, filters.country]
  });

  await ctx.render('admin/accounts', {
    layout: 'admin/base',
    selected: 'accounts',
    session: ctx.session,
    users: result,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(count.count / configEcom.SETTINGS["elements_per_page"]))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminStaffs(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  if (!await utilsEcom.hasPermission(ctx, 'staff.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see staff",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see staffs without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
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

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  const result = await db.query(`SELECT * FROM staffs WHERE
    position(upper($1) in upper(username)) > 0 AND
    position(upper($2) in upper(email)) > 0 AND
    "deletedAt" is NULL ORDER BY "createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}`, {
    type: 'SELECT',
    plain: false,
    model: Staff,
    mapToModel: true,
    bind: [filters.user, filters.email]
  });

  const count = await db.query(`SELECT COUNT(*) FROM staffs WHERE
    position(upper($1) in upper(username)) > 0 AND
    position(upper($2) in upper(email)) > 0 AND
    "deletedAt" is NULL`, {
    type: 'SELECT',
    plain: true,
    bind: [filters.user, filters.email]
  });

  await ctx.render('admin/staff', {
    layout: 'admin/base',
    selected: 'staff',
    session: ctx.session,
    staff: result,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(count.count / configEcom.SETTINGS["elements_per_page"]))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminRoles(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  if (!await utilsEcom.hasPermission(ctx, 'roles.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see roles",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see roles without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = configEcom.SETTINGS["elements_per_page"];
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
    pages: utilsEcom.givePages(page, Math.ceil(result.count / configEcom.SETTINGS["elements_per_page"]))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminOrders(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  if (!await utilsEcom.hasPermission(ctx, 'orders.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see orders",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see orders without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
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
    filtersToReturn['status'] = configEcom.STATUS_DISPLAY[ctx.query.status];
  } else {
    let stat = [];

    for (i = 1; i < configEcom.STATUS_DISPLAY.length; i++)
      stat.push(i);

    filters['status'] = stat;
  }
  if (ctx.query.ordBefore) {
    filters['ordBefore'] = ctx.query.ordBefore;
    filtersToReturn['ordBefore'] = ctx.query.ordBefore;
  } else {
    filters['ordBefore'] = new Date().toISOString();
  }
  if (ctx.query.ordAfter) {
    filters['ordAfter'] = ctx.query.ordAfter;
    filtersToReturn['ordAfter'] = ctx.query.ordAfter;
  } else {
    filters['ordAfter'] = new Date(0).toISOString();
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }
  
  const result = await Order.findAndCountAll({
    where: {
      status: { [Op.gte]: 1 },
    },
    limit: limit,
    offset: offset,
    include: User,
    order: [
      ['orderedAt', 'DESC']
    ]
  });

  await ctx.render("/admin/orders", {
    layout: "/admin/base",
    session: ctx.session,
    selected: "orders",
    orders: result.rows,
    statuses: configEcom.STATUS_DISPLAY,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / configEcom.SETTINGS["elements_per_page"]))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminReport(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  if (!await utilsEcom.hasPermission(ctx, 'report.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see reports",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see report without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.timegroup) {
    filters['timegroup'] = ctx.query.timegroup
    filtersToReturn['timegroup'] = ctx.query.timegroup
  } else {
    filtersToReturn['timegroup'] = '2';
  }
  if (ctx.query.ordBefore) {
    filters['ordBefore'] = ctx.query.ordBefore;
    filtersToReturn['ordBefore'] = ctx.query.ordBefore;
  } else {
    filters['ordBefore'] = new Date().toISOString();
  }
  if (ctx.query.ordAfter) {
    filters['ordAfter'] = ctx.query.ordAfter;
    filtersToReturn['ordAfter'] = ctx.query.ordAfter;
  } else {
    filters['ordAfter'] = new Date(0).toISOString();
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;

  if (ctx.params.page) {
    offset = (parseInt(ctx.params.page) - 1) * limit;
  }

  let time = 'month';

  switch (filters.timegroup) {
    case '0':
      time = 'day';
      break;
    case '1':
      time = 'week';
      break;
    case '2':
      time = 'month';
      break;
    case '3':
      time = 'year';
      break;
  }

  const [reportRes, count] = await utilsEcom.getReportResponce(filters, limit, offset, time);

  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} generated orders report from ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time} `,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  await ctx.render('/admin/report', {
    layout: '/admin/base',
    selected: 'report',
    session: ctx.session,
    report: await reportRes,
    filters: filtersToReturn,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil((await count)[0].count / configEcom.SETTINGS["elements_per_page"])),
  });
}

async function getAdminAudit(ctx) {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  if (!await utilsEcom.hasPermission(ctx, 'audit.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see audit",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see audit without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.user) {
    filters['user'] = ctx.query.user;
    filtersToReturn['user'] = ctx.query.user;
  } else {
    filters['user'] = '';
  }
  if (ctx.query.level) {
    filters['level'] = ctx.query.level;
    filtersToReturn['level'] = ctx.query.level;
  } else {
    filters['level'] = '';
  }
  if (ctx.query.ordBefore) {
    filters['ordBefore'] = ctx.query.ordBefore;
    filtersToReturn['ordBefore'] = ctx.query.ordBefore;
  } else {
    filters['ordBefore'] = new Date().toISOString();
  }
  if (ctx.query.ordAfter) {
    filters['ordAfter'] = ctx.query.ordAfter;
    filtersToReturn['ordAfter'] = ctx.query.ordAfter;
  } else {
    filters['ordAfter'] = new Date(0).toISOString();
  }
  if (ctx.query.longmsg == 1) {
    filters['longmsg'] = true;
    filtersToReturn['longmsg'] = true;
  } else if (ctx.query.longmsg === '0') {
    filters['longmsg'] = false;
    filtersToReturn['longmsg'] = false;
  }
  if (ctx.query.datetrunc) {
    filters['datetrunc'] = ctx.query.datetrunc;
    filtersToReturn['datetrunc'] = ctx.query.datetrunc;
  } else {
    filters['datetrunc'] = '-1';
    filtersToReturn['datetrunc'] = '-1';
  }

  let time;

  switch (filters.datetrunc) {
    case '0':
      time = 'day';
      break;
    case '1':
      time = 'week';
      break;
    case '2':
      time = 'month';
      break;
    case '3':
      time = 'year';
      break;
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = configEcom.SETTINGS["elements_per_page"];
  let offset = 0;

  if (ctx.params.page) {
    offset = (page - 1) * limit;
  }

  let query = `SELECT * FROM logs WHERE
  position(upper($1) in upper(user)) > 0 AND
  position(upper($2) in upper(level)) > 0 AND
  timestamp BETWEEN '$3' AND '$4'
  ORDER BY timestamp DESC`;

  if (filters.datetrunc != '-1') {
    query = `SELECT count(*), date_trunc('${time}', timestamp) t FROM logs WHERE
      position(upper($1) in upper(user)) > 0 AND
      position(upper($2) in upper(level)) > 0 AND
      timestamp BETWEEN '$3' AND '$4'
      GROUP BY t
      ORDER BY t DESC`;
  }

  let queryC = `SELECT COUNT(*) FROM (${query}) foo`

  query += `\nLIMIT ${limit} OFFSET ${offset}`;

  const result = await db.query(query, {
    type: 'SELECT',
    plain: false,
    model: Log,
    mapToModel: true,
    bind: [filters.user, filters.level, filters.ordAfter, filters.ordBefore]
  });

  const count = await db.query(queryC, {
    type: 'SELECT',
    plain: true,
    bind: [filters.user, filters.level, filters.ordAfter, filters.ordBefore]
  });

  await ctx.render("/admin/audit", {
    layout: "/admin/base",
    session: ctx.session,
    selected: "audit",
    report: result,
    filters: filtersToReturn,
    levels: utilsEcom.LOG_LEVELS,
    page: page,
    pages: utilsEcom.givePages(page, Math.ceil(count.count / configEcom.SETTINGS["elements_per_page"]))
  });

  // Clear the messages
  ctx.session.messages = null;
}

router.get("/", async ctx => getIndex(ctx));

router.get("/products", async ctx => getProducts(ctx));

router.get("/products/:page", async ctx => getProducts(ctx));

router.get("/my-account", async ctx => getMyAccount(ctx));

router.get("/my-account/orders/:page", async ctx => getMyAccount(ctx));

router.get("/register", async ctx => {
  let cartQty = await utilsEcom.getCartQuantity(ctx);

  await ctx.render('register', {
    selected: 'register',
    session: ctx.session,
    cartQty: cartQty
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
    // let message = { 'userExists': 'User already exists with this email or username' };
    // ctx.session.messages = message;

    utilsEcom.logger.info(`Someone tried to register as already existing user ${ctx.request.fields.username}`);
    // ctx.redirect('/register');

    ctx.body = {
      message: 'User already exists with this email or username'
    };
    return;
  }
  else {
    // Password correct?
    if (ctx.request.fields.password !== ctx.request.fields.password1) {
      ctx.body = {
        message: 'Passwords does not match!'
      };

      return;
    }

    // Send email
    let token = utilsEcom.generateEmailVerfToken();

    try {
      await User.create({
        username: ctx.request.fields.username,
        email: ctx.request.fields.email,
        password: ctx.request.fields.password1,
        firstName: ctx.request.fields.first,
        lastName: ctx.request.fields.last,
        address: ctx.request.fields.address,
        country: ctx.request.fields.country,
        gender: ctx.request.fields.gender,
        birthday: ctx.request.fields.birthday,
        verificationToken: token,
      });
    } catch (e) {
      if (e instanceof ValidationError) {
        // undefined on /register
        ctx.body = {
          message: e.errors.length != 0 ? e.errors[0].message : e.message
        };
      }
      return;
    }

    let msg = `Here is your link: ` + utilsEcom.getHost() + `/verify_account/${token}`

    utilsEcom.sendEmail(configEcom.SETTINGS.sender_email_parent, ctx.request.fields.email, `Email Verification NodeJS`, msg);

    let message = { 'registerSuccess': 'Please validate your e-mail!' };
    ctx.session.messages = message;

    ctx.body = {
      ok: "redirect"
    };
    return;

    // ctx.redirect('/');
  }
});

router.get('/verify_account/:token', async ctx => {
  let token = ctx.params.token;

  const user = await User.findOne({
    where: {
      verificationToken: token
    }
  });

  if (user == null) {
    let messages = { 'verfError': 'Invalid token!' };
    ctx.session.messages = messages;

    utilsEcom.logger.log('info',
      `Someone has entered invalid token ${ctx.params.token}!`);
    ctx.redirect('/');
    return;
  }

  if (!user.emailConfirmed) {
    var messages = { 'registerSuccess': 'Your email is validated!' };

    user.set({ emailConfirmed: true });
    await user.save();
  } else {
    var messages = { 'registerSuccess': 'Your email is already validated!' };
  }

  ctx.session.messages = messages;

  utilsEcom.logger.log('info',
    `User ${user.username} validated their e-mail!`,
    { user: user.username });

  ctx.redirect('/');
});

router.post("/login", async ctx => {
  const user = await User.findOne({
    where: {
      username: ctx.request.fields.username
    }
  });

  if (!user) {
    let messages = { 'loginErrorUser': 'User not found!' };
    ctx.session.messages = messages;

    utilsEcom.logger.log('info',
      `Tried to log in with invalid username ${ctx.request.fields.username} as user!`);
    ctx.redirect("/");

    return;
  }

  if (user.authenticate(ctx.request.fields.password)) {
    if (!user.emailConfirmed) {
      ctx.session.messages = { 'emailNotConfirmed': 'Your email is not confirmed!' };
      ctx.redirect("/");
      return;
    }

    // Transfer cookies to db
    if (ctx.cookies.get("products")) {
      let cookieProducts = JSON.parse(ctx.cookies.get("products"));

      for (i in cookieProducts) {
        const product = await Product.findOne({ where: { id: i } });

        if (product) {
          const [order, createdorder] = await Order.findOrCreate({
            where: {
              status: 0
            },
            include: [{
              model: User,
              required: true,
              where: {
                'username': ctx.request.fields.username
              }
            }],
            paranoid: false,
            defaults: {}
          });

          const [orderitem, createdorderitem] = await OrderItem.findOrCreate({
            where: {
              productId: product.id
            },
            include: [{
              model: Order,
              required: true,
              where: {
                id: order.id
              }
            }],
            defaults: {
              productId: product.id,
              quantity: parseInt(cookieProducts[i]),
            }
          });

          if (product.quantity < orderitem.quantity + parseInt(cookieProducts[i])) {
            await orderitem.update({
              quantity: product.quantity
            });
          }
          else {
            if (!createdorderitem) {
              await orderitem.update({
                quantity: orderitem.quantity + parseInt(cookieProducts[i])
              });
            }
          }

          if (createdorderitem) {
            await order.addOrderitem(orderitem);
          }

          if (createdorder) {
            await user.addOrder(order);
          }
        }
      }

      // if (ctx.cookies.get("productsOld"))
      //   ctx.cookies.set("productsOld", utilsEcom.combineTwoObjects(ctx.cookies.get("productsOld"), ctx.cookies.get("products")));
      // else ctx.cookies.set("productsOld", ctx.cookies.get("products"));
      // ctx.cookies.set("products", null);
    }

    let messages = { 'loginSuccess': 'Successful login!' };
    ctx.session.messages = messages;
    ctx.session.username = ctx.request.fields.username;

    utilsEcom.logger.log('info',
      `User ${ctx.request.fields.username} logged in!`,
      { user: ctx.request.fields.username });

    await user.update({
      lastLogin: Sequelize.fn('NOW')
    });
  }
  else {
    let messages = { 'loginErrorPass': 'Wrong password!' };
    ctx.session.messages = messages;

    utilsEcom.logger.log('info',
      `User ${ctx.request.fields.username} tried to log in with invalid password!`,
      { user: ctx.request.fields.username });
  }

  ctx.redirect('/');
});

router.get('/logout', async ctx => {
  ctx.session.messages = { 'logout': 'Log-out successful!' };

  utilsEcom.logger.log('info',
    `User ${ctx.session.username} logged out!`,
    { user: ctx.session.username });

  ctx.session.username = null;

  ctx.redirect('/')
});

router.get('/admin', async ctx => {
  if (await utilsEcom.isAuthenticatedStaff(ctx)) {

    let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

    // Auto session expire
    if (utilsEcom.isSessionValid(staff)) {
      utilsEcom.onSessionExpired(ctx);

      return;
    } else {
      await staff.update({
        lastActivity: Sequelize.fn("NOW")
      });
    }

    const orders = await Order.findAll({
      where: {
        status: { [Op.gte]: 1 }
      },
      order: [
        ['createdAt', 'DESC']
      ],
      limit: 10
    });

    let orderitems = []

    for (i = 0; i < orders.length; i++) {
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
      user: await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } }),
      orders: orders,
      orderitems: orderitems,
      users: users,
      statusDisplay: configEcom.STATUS_DISPLAY
    });

    // Clear old messages
    ctx.session.messages = null;
  } else ctx.redirect("/admin/login");
});

router.get('/admin/login', async ctx => {
  if (await utilsEcom.isAuthenticatedStaff(ctx)) {
    ctx.redirect('/admin');
  } else {
    await ctx.render('/admin/login', { layout: false, selected: 'login', session: ctx.session });
  }

  // Clear old messages
  ctx.session.messages = null;
});

router.post('/admin/login', async ctx => {
  const user = await Staff.findOne({
    where: {
      username: ctx.request.fields.username
    }, include: Role
  });

  if (!user) {
    let messages = { 'loginErrorUser': 'User not found!' };
    ctx.session.messages = messages;

    utilsEcom.logger.log('info',
      `Tried to log in with invalid username ${ctx.request.fields.username} as staff!`);
    ctx.redirect("/admin");

    return;
  }

  if (user.authenticate(ctx.request.fields.password)) {
    let messages = { 'loginSuccess': 'Successful login!' };
    ctx.session.messages = messages;
    ctx.session.staffUsername = ctx.request.fields.username;

    utilsEcom.logger.log('info',
      `Staff ${ctx.request.fields.username} logged in!`,
      { user: ctx.request.fields.username, isStaff: true });

    await user.update({
      lastLogin: Sequelize.fn('NOW'),
      lastActivity: Sequelize.fn('NOW')
    });
  }
  else {
    let messages = { 'loginErrorPass': 'Wrong password!' };
    ctx.session.messages = messages;

    utilsEcom.logger.log('info',
      `Staff ${ctx.request.fields.username} tried to log in with invalid password!`,
      { user: ctx.request.fields.username, isStaff: true });

    ctx.redirect('/admin/login');
    return;
  }

  ctx.redirect('/admin');
});

router.get('/admin/logout', async ctx => {
  ctx.session.messages = { 'logout': 'Log-out successful!' };
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} logged out!`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.session.staffUsername = null

  ctx.redirect('/admin/login');
});

router.get('/admin/products', async ctx => getAdminProducts(ctx));
router.get('/admin/products/:page', async ctx => getAdminProducts(ctx));

router.post('/admin/products/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'product.create')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to create product",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to create a product without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let price = parseFloat(parseFloat(ctx.request.fields.price).toFixed(2));
  let discountPrice = parseFloat(parseFloat(ctx.request.fields.discountPrice).toFixed(2));

  if (price > 9999.99 || price <= 0 || discountPrice > 9999.99 || discountPrice <= 0) {
    // ctx.session.messages = { 'productErrorPrice': 'Product has invalid price (0 - 9999.99)' };
    // ctx.redirect('/admin/products/');

    ctx.body = {"error": "Product's price must be within range (0 - 9999.99]"}
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
      // ctx.session.messages = { 'productExist': `The product with name ${ctx.request.fields.name} already exists!` };
      // ctx.redirect('/admin/products');

      ctx.body = {"error": `The product with name ${ctx.request.fields.name} already exists!`};
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
  ctx.body = {"ok": "ok"};

  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} created product #${product.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });
  // ctx.redirect('/admin/products');
});

router.get('/admin/products/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'products.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update a product",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update product #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let categories = {};

  await Category.findAll().then((categoriesv) => categories = categoriesv);

  await Product.findOne({
    where: {
      id: ctx.params.id
    }
  }).then(async product => {
    if (!product) 
    {
      ctx.session.messages = {"invalidVal": "Product with this id doesn't exist!"};
      ctx.redirect("/admin/products");
      return;
    }
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
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'products.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update a product",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update product #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
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
      if (err) {
        utilsEcom.logger.log('error',
          `There was an error while trying to edit the image of product # ${ctx.params.id}!
        ${err.message}`);
        throw err;
      }
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
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} updated product #${ctx.params.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/products/edit/' + ctx.params.id);
});

router.post('/admin/products/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'products.delete')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to delete a product",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to delete product/s with id/s ${ctx.request.fields.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  ids = ctx.request.fields.id;

  await Product.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'productDeleted': 'Selected product/s have been deleted!' }
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} deleted product/s with id/s ${ctx.request.fields.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/products');
});

router.get('/product-detail/:id', async ctx => {
  const product = await Product.findOne({
    where: {
      id: ctx.params.id
    }
  });

  const categories = await Category.findAll();

  let cartQty = await utilsEcom.getCartQuantity(ctx);

  await ctx.render('product-detail', {
    session: ctx.session,
    cartQty: cartQty,
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
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'accounts.delete')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to delete a account",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to delete account/s with id/s ${ctx.request.fields.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  ids = ctx.request.fields.id;

  await User.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'accountDeleted': 'Selected accounts have been deleted!' }
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} deleted account/s with id/s ${ctx.request.fields.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/accounts');
});

router.post('/admin/accounts/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'accounts.create')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to create an account",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to create an account without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let defaultParams = {
    username: ctx.request.fields.username,
    email: ctx.request.fields.email,
    password: ctx.request.fields.password,
    firstName: ctx.request.fields.firstname,
    lastName: ctx.request.fields.lastname,
    address: ctx.request.fields.address,
    country: ctx.request.fields.country,
    gender: ctx.request.fields.gender,
    birthday: ctx.request.fields.birthday,
    emailConfirmed: true
  };

  let [user, created] = [null, null];

  try {
    [user, created] = await User.findOrCreate({
      where: {
        [Op.or]: [
          { email: ctx.request.fields.email },
          { username: ctx.request.fields.username }
        ]
      },
      paranoid: false,
      defaults: defaultParams
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      ctx.body = {"error": e.errors.length != 0 ? e.errors[0].message : e.message};
      return;
    } else {
      throw e;
    }
  }

  if (!created) {
    if (!user.deletedAt) {
      ctx.body = {"error": `A user with that username or email already exists!`};
      return;
    } else {
      await user.restore();

      await user.update(defaultParams);
    }
  }

  ctx.session.messages = { 'accountCreated': `User with id ${user.id} has been created!` };
  ctx.body = {"ok": "ok"};

  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} created account #${user.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  // ctx.redirect('/admin/accounts');
});

router.get('/admin/staff', async ctx => getAdminStaffs(ctx));
router.get('/admin/staff/:page', async ctx => getAdminStaffs(ctx));

router.post('/admin/staff/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'staff.create')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to create a staff",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to create a staff without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let defaultParams = {
    username: ctx.request.fields.username,
    email: ctx.request.fields.email,
    password: ctx.request.fields.password,
    firstName: ctx.request.fields.firstname,
    lastName: ctx.request.fields.lastname,
  };

  let [user, created] = [null, null];

  try {
    [user, created] = await Staff.findOrCreate({
      where: {
        [Op.or]: [
          { email: ctx.request.fields.email },
          { username: ctx.request.fields.username }
        ]
      },
      paranoid: false,
      defaults: defaultParams
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      ctx.body = { 'error': e.errors.length != 0 ? e.errors[0].message : e.message };
      return;
    }
  }

  if (!created) {
    if (!user.deletedAt) {
      ctx.body = { 'error': `Staff ${ctx.request.fields.username} already exists!` };
      return;
    } else {
      await user.restore();

      await user.update(defaultParams);
    }
  }

  ctx.session.messages = { 'staffCreated': `Staff with id ${user.id} has been created!` };
  ctx.body = { 'ok': 'ok'};

  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} created staff #${user.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });
});

router.post('/admin/staff/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'staff.delete')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to delete staff",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to delete staff/s with id/s ${ctx.request.fields.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  ids = ctx.request.fields.id;

  await Staff.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'staffDeleted': 'Selected staff were deleted!' }
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} deleted staff/s with id/s ${ctx.request.fields.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/staff');
});

router.get('/admin/staff/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'staff.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update staff",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update staff #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staffc = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staffc)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staffc.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

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
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'staff.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update staff",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update staff #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staffc = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staffc)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staffc.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let updateParams = {
    username: ctx.request.fields.name,
    email: ctx.request.fields.email
  }

  const staff = await Staff.findOne({ where: { id: ctx.params.id } });

  staff.update(updateParams);

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
  ctx.session.messages = { 'staffEdited': `Staff with id ${ctx.params.id} was edited!` };
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} updated staff #${ctx.params.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });
  ctx.redirect('/admin/staff/edit/' + ctx.params.id);
});

router.post('/admin/categories/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'categories.create')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to create a category",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to create a category without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  const [category, created] = await Category.findOrCreate({
    where: {
      name: ctx.request.fields.name,
      imageCss: ctx.request.fields.image
    }
  });

  if (created) {
    ctx.session.messages = { 'categoryCreated': `Category with id ${ctx.params.id} has been created!` };
    utilsEcom.logger.log('info',
      `Staff ${ctx.session.dataValues.staffUsername} created category #${ctx.params.id}`,
      { user: ctx.session.dataValues.staffUsername, isStaff: true });
  }
  else {
    ctx.session.messages = { 'categoryExist': `Category with id ${ctx.params.id} already exists!` };
  }

  ctx.redirect('/admin/products')
});

router.post('/admin/categories/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'categories.delete')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to delete a category",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to delete category/ies with id/s ${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  await Category.destroy({
    where: {
      id: ctx.request.fields.id
    }
  });

  ctx.session.messages = { 'categoryDeleted': `Selected categories have been deleted!` };
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} deleted category/ies with id/s ${ctx.request.fields.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });
  ctx.redirect('/admin/products');
});

router.post('/admin/roles/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.create')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to create a role",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to create a role without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let [role, created] = [null, null];

  try {
    [role, created] = await Role.findOrCreate({
      where: {
        name: ctx.request.fields.role,
      },
      include: Permission,
      paranoid: false
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      ctx.body = {"error": e.errors.length != 0 ? e.errors[0].message : e.message};
      return;
    }
  }

  if (ctx.request.fields.permissions instanceof Array) {
    for (permid in ctx.request.fields.permissions) {
      const permission = await Permission.findOne({ where: { id: ctx.request.fields.permissions[permid] } });
      
      if (permission)
        await role.addPermission(permission);
    }
  }
  else if (ctx.request.fields.permissions) {
    const permission = await Permission.findOne({ where: { id: ctx.request.fields.permissions } });

    if(permission)
      await role.addPermission(permission);
  }

  if (created || role.deletedAt) {
    if (role.deletedAt)
      await role.restore();

    ctx.session.messages = { 'roleCreated': `Role ${role.name} has been created!` };
    ctx.body = {'ok': 'ok'};

    utilsEcom.logger.log('info',
      `Staff ${ctx.session.dataValues.staffUsername} created role #${role.id}`,
      { user: ctx.session.dataValues.staffUsername, isStaff: true });
  }
  else {
    ctx.body = { 'error': `Role with name ${role.name} already exists!` };
    return;
  }
});

router.post('/admin/roles/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.delete')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to delete a role",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to delete role/s with id/s ${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  await Role.destroy({
    where: {
      id: ctx.request.fields.id
    }
  });
  ctx.session.messages = { 'roleDeleted': 'Selected roles were deleted!' }
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} deleted role/s with id/s ${ctx.request.fields.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/roles');
});

router.get('/admin/roles/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update a role",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update role #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

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
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'roles.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update a role",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update role #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
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
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} updated role #${ctx.params.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/roles');
});

router.get('/admin/roles', async ctx => getAdminRoles(ctx));
router.get('/admin/roles/:page', async ctx => getAdminRoles(ctx));

// Getters
router.get('/api/permissions/get', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let term = ctx.request.query.term;

  if (!term) {
    ctx.body = {};
    return;
  }

  ctx.body = JSON.stringify(
    await db.query(`SELECT id, name as value FROM permissions WHERE
      position(upper($1) in upper(name)) > 0`, {
      type: "SELECT",
      plain: false,
      model: Permission,
      mapToModel: true,
      bind: [term]
    })
  );
});

router.get('/api/accounts/get', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let term = ctx.request.query.term;

  if (!term) {
    ctx.body = {};
    return;
  }

  ctx.body = JSON.stringify(
    await db.query(`SELECT id, username as value FROM accounts WHERE
      position(upper($1) in upper(name)) > 0`, {
      type: "SELECT",
      plain: false,
      model: Permission,
      mapToModel: true,
      bind: [term]
    })
  );
});

router.get('/api/products/get', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  let term = ctx.request.query.term;

  if (!term) {
    ctx.body = {};
    return;
  }

  ctx.body = JSON.stringify(
    await db.query(`SELECT id, name as value FROM products WHERE
      position(upper($1) in upper(name)) > 0`, {
      type: "SELECT",
      plain: false,
      model: Permission,
      mapToModel: true,
      bind: [term]
    })
  );
});

router.post('/admin/api/products/import/csv', async ctx => {
  console.log(ctx.request.files);

  await new Promise((resolve, reject) => {
    fs.createReadStream(ctx.request.files[0].path)
      .pipe(csv.parse())
      .on('error', error => {
        utilsEcom.handleError(error);
        reject(error);
      })
      .on('data', row => {
        console.log(`ROW=${JSON.stringify(row)}`);
      })
      .on('end', rowCount => resolve(rowCount));
  });
  
  ctx.session.messages = {"importedCSV": "CSV imported successfuly!"};
  ctx.redirect("/admin/products");
});

router.get('/admin/orders', async ctx => getAdminOrders(ctx));
router.get('/admin/orders/:page', async ctx => getAdminOrders(ctx));

router.post('/admin/orders/add', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'orders.create')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to create an order",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to create an order without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let items = ctx.request.fields.items;

  let order = await Order.create({
    status: ctx.request.fields.status,
    orderedAt: Sequelize.fn('NOW'),
  });

  if (items instanceof Array) {
    for (i = 0; i < items.length; i++) {
      let orderitem = await OrderItem.create({ quantity: parseInt(items[i].split(" ")[1]) });
      let product = await Product.findOne({ where: { id: parseInt(items[i].split(" ")[0]) } });
      await orderitem.setProduct(product);

      await order.addOrderitem(orderitem);
    }
  }
  else {
    let orderitem = await OrderItem.create({ quantity: parseInt(items.split(" ")[1]) });
    let product = await Product.findOne({ where: { id: parseInt(items.split(" ")[0]) } });
    await orderitem.setProduct(product);

    await order.addOrderitem(orderitem);
  }

  await order.update({ price: await order.getTotal() });

  let user = await User.findOne({
    where: {
      username: ctx.request.fields.user
    }
  });

  await user.addOrder(order);

  await utilsEcom.removeProductQtyFromOrder(order);

  ctx.session.messages = { 'orderCreated': 'Order created!' };
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} created order #${order.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/orders');
});

router.post('/admin/orders/delete', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'orders.delete')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to delete an order",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to delete order/s with id/s ${ctx.request.fields.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  ids = ctx.request.fields.id;

  if (ids instanceof Array) {
    for (i = 0; i < ids.length; i++) {
      utilsEcom.addProductQtyFromOrder(await Order.findOne({ where: { id: ids[i] } }));
    }
  } else {
    utilsEcom.addProductQtyFromOrder(await Order.findOne({ where: { id: ids } }));
  }

  await Order.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'orderDeleted': 'Selected orders have been deleted!' };
  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} deleted order/s with id/s ${ctx.request.fields.id}`,
    { user: ctx.session.dataValues.staffUsername, isStaff: true });

  ctx.redirect('/admin/orders');
});

router.get('/admin/orders/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'orders.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update an order",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update order #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  const order = await Order.findOne({
    where: {
      id: ctx.params.id
    }
  });

  let orderitems = await order.getOrderitems();

  let products = [];

  // TODO: Add option to edit payment status

  for (i = 0; i < orderitems.length; i++) {
    products.push(await (orderitems[i].getProduct()));
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
    statuses: configEcom.STATUS_DISPLAY
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.post('/admin/orders/edit/:id', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'orders.update')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to update an order",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to update order #${ctx.params.id} without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  const order = await Order.findOne({
    where: {
      id: ctx.params.id
    }
  });

  // Remove orderitems from the order
  await utilsEcom.addProductQtyFromOrder(order);

  let orderitems = await order.getOrderitems();

  for (i = 0; i < orderitems.length; i++) {
    await orderitems[i].destroy();
  }

  // Add new orderitems to the order
  if (ctx.request.fields.items instanceof Array) {
    for (i = 0; i < ctx.request.fields.items.length; i++) {
      let product = await Product.findOne({ where: { id: ctx.request.fields.items[i].split(", ")[0] } });
      let orderitem = await OrderItem.create({ quantity: ctx.request.fields.items[i].split(", ")[1] });
      await orderitem.setProduct(product);

      await order.addOrderitem(orderitem);
    }
  }
  else {
    let product = await Product.findOne({ where: { id: ctx.request.fields.items.split(", ")[0] } });
    let orderitem = await OrderItem.create({ quantity: ctx.request.fields.items.split(", ")[1] });
    await orderitem.setProduct(product);

    await order.addOrderitem(orderitem);
  }

  await utilsEcom.removeProductQtyFromOrder(order);

  if (order.status != ctx.request.fields.status) {
    utilsEcom.logger.log('info',
      `Staff ${ctx.session.dataValues.staffUsername} updated status of order #${ctx.params.id}`,
      {
        user: ctx.session.dataValues.staffUsername,
        isStaff: true,
        longMessage:
          `Staff ${ctx.session.dataValues.staffUsername} updated status of order #${ctx.params.id} from ${configEcom.STATUS_DISPLAY[order.status]} to ${configEcom.STATUS_DISPLAY[ctx.request.fields.status]}`
      });
  }

  // Update status, price and orderedAt
  await order.update({
    status: ctx.request.fields.status,
    price: await order.getTotal(),
    orderedAt: ctx.request.fields.orderedDate
  });

  // Set the new user
  await order.removeUsers(await order.getUsers());
  await order.addUser(await User.findOne({ where: { username: ctx.request.fields.user } }));

  ctx.session.messages = { 'orderEdited': `Order with id ${ctx.params.id} has been updated!` };

  ctx.redirect('/admin/orders');
});

router.get('/addToCart', async ctx => {
  // Currently working only for registered users
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    let qty = ctx.query.quantity;

    if (ctx.cookies.get('products')) {
      const json = JSON.parse(ctx.cookies.get('products'));

      if (json[ctx.query.id])
        qty = parseInt(json[ctx.query.id]) + parseInt(ctx.query.quantity);
    }

    if (!ctx.cookies.get('products'))
      ctx.cookies.set('products', `{"${ctx.query.id}": ${ctx.query.quantity}}`, { httpOnly: true, expires: new Date(2147483647e3) });
    else {
      try {
        var cooks = JSON.parse(ctx.cookies.get('products'));
      } catch (e) {
        var cooks = {};
      }

      if (await utilsEcom.compareQtyAndProductQty(ctx.query.id, qty + cooks[ctx.query.id]) == 0) {
        if (ctx.query.cart) {
          ctx.status = 400;
        } else {
          ctx.session.messages = { 'notEnoughQty': 'Not enough quantity of the given product!' };
          ctx.redirect('/products');
        }

        return;
      }

      if (!cooks[ctx.query.id])
        cooks[ctx.query.id] = ctx.query.quantity;
      else {
        try {
          cooks[ctx.query.id] = parseInt(cooks[ctx.query.id]) + parseInt(ctx.query.quantity);
        } catch (e) {
          cooks[ctx.query.id] = ctx.query.quantity;
        }
      }

      ctx.cookies.set('products', JSON.stringify(cooks), { httpOnly: true, expires: new Date(2147483647e3) });
    }

    ctx.session.messages = { 'productAdded': 'Product added to the cart!' };
    ctx.redirect('/products');
    // ctx.redirect('/');
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

  if (await utilsEcom.compareQtyAndProductQty(ctx.query.id, parseInt(orderitem.quantity) + parseInt(ctx.query.quantity)) == 0) {
    if (ctx.query.cart) {
      ctx.status = 400;
    } else {
      ctx.session.messages = { 'notEnoughQty': 'Not enough quantity of the given product!' };
      ctx.redirect('/products');
    }

    return;
  }

  if (createdorderitem)
    await order.addOrderitem(orderitem);
  else {
    await orderitem.update({
      quantity: parseInt(orderitem.quantity) + parseInt(ctx.query.quantity)
    });
  }
  if (createdorder)
    await user.addOrder(order);
  
  // TODO: RECODE ADDTOCART AND REMOVEFROMCART !!!
  // Return it's product price, it's total price, subtotal. vatsum and grandtotal

  if (ctx.query.cart) {
    ctx.body = {
      'status': 'ok',
      'prodPrice': await (await orderitem.getProduct()).getDiscountPriceWithVAT(),
      'totalProdPrice': await orderitem.getTotalWithVAT(),
      'subTotal': await order.getTotal(),
      'vatSum': await order.getVATSum(),
      'grandTotal': await order.getTotalWithVAT(),
    };
  } else {
    ctx.session.messages = { 'productAdded': 'Product added to cart!' };
    ctx.redirect('/products');
  }
});

router.get('/removeFromCart', async ctx => {
  const quantity = ctx.query.quantity;

  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    let products = JSON.parse(ctx.cookies.get('products'));

    if (products[ctx.query.id]) {
      if (quantity > 0) {
        if (products[ctx.query.id] > quantity)
          products[ctx.query.id] -= quantity;
        else {
          ctx.status = 400;
          return;
        }
      } else {
        delete products[ctx.query.id];
      }
    }

    ctx.cookies.set('products', JSON.stringify(products), { httpOnly: true, expires: new Date(2147483647e3) });

    ctx.session.messages = { 'cartRemoved': 'Removed selected items from the cart' };
    ctx.redirect('/cart');
    return;
  }

  const order = await Order.findOne({
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

  const orderitem = await OrderItem.findOne({
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

  if (quantity > 0) {
    if (orderitem.quantity <= 1) {
      ctx.status = 400;
      return;
    }

    await orderitem.update({
      quantity: parseInt(orderitem.quantity) - parseInt(quantity)
    });
  }
  else {
    await orderitem.destroy();
  }

  ctx.body = {
    'status': 'ok',
    'prodPrice': await (await orderitem.getProduct()).getDiscountPriceWithVAT(),
    'totalProdPrice': await orderitem.getTotalWithVAT(),
    'subTotal': await order.getTotal(),
    'vatSum': await order.getVATSum(),
    'grandTotal': await order.getTotalWithVAT(),
  };
});

router.get('/cart', async ctx => {
  // Currently working only for registered users
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    let orderitems = [];
    let products = [];
    let totals = [];
    let orderTotal = "0.00";
    let orderVATSum = "0.00";

    if (ctx.cookies.get("products")) {
      var cookieProducts = JSON.parse(ctx.cookies.get("products"));

      for (i in cookieProducts) {
        let product = await Product.findOne({ where: { id: i } });

        if (product) {
          orderitems.push({ 'id': i, 'productId': i, 'quantity': cookieProducts[i] });
          products.push(product);
          totals.push((parseFloat(cookieProducts[i]) * parseFloat(await product.discountPrice)).toFixed(2));
        }
      }

      orderTotal = totals.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a), 0).toFixed(2);
      orderVATSum = totals.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a * configEcom.DEFAULT_VAT), 0).toFixed(2);
    }

    let cartQty = await utilsEcom.getCartQuantity(ctx);

    await ctx.render('cart', {
      session: ctx.session,
      selected: 'cart',
      cartQty: cartQty,
      items: orderitems,
      products: products,
      totals: totals,
      orderTotal: orderTotal,
      orderVATSum: orderVATSum,
    });

    // Clear the messages
    ctx.session.messages = null;

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
    products.push(await (orderitems[i].getProduct()));
  }

  let totals = [];

  for (i = 0; i < orderitems.length; i++) {
    totals.push((await (orderitems[i].getTotalWithVAT())).toFixed(2));
  }

  let subTotal = "0.00";
  let grandTotal = "0.00";
  let orderVATSum = "0.00";

  if (order) {
    subTotal = await order.getTotal();
    grandTotal = await order.getTotalWithVAT();
    orderVATSum = await order.getVATSum();
  }

  let cartQty = await utilsEcom.getCartQuantity(ctx);

  await ctx.render('cart', {
    session: ctx.session,
    selected: 'cart',
    cartQty: cartQty,
    items: orderitems,
    products: products,
    totals: totals,
    subTotal: subTotal,
    grandTotal: grandTotal,
    orderVATSum: orderVATSum,
  });

  // Clear the messages
  ctx.session.messages = null;
});

router.get('/checkout', async ctx => {
  // Currently working only for registered users
  if (!await utilsEcom.isAuthenticatedUser(ctx)) {
    utilsEcom.onNotAuthenticatedUser(ctx);
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

  let qty = await utilsEcom.hasEnoughQtyOfProductsOfOrder(order);

  if (qty !== true) {
    ctx.session.messages = { "notEnoughQty": "There are not enough quantities of the selected product: " + qty }
    ctx.redirect("/cart");
    return;
  }

  orderitems = await order.getOrderitems();

  let products = [];

  for (i = 0; i < orderitems.length; i++) {
    products.push(await (orderitems[i].getProduct()));
  }

  let totals = [];

  for (i = 0; i < orderitems.length; i++) {
    totals.push(await (orderitems[i].getTotalWithVAT()));
  }

  let subTotal = await order.getTotal();
  let grandTotal = await order.getTotalWithVAT();
  let orderVATSum = await order.getVATSum();

  let cartQty = await utilsEcom.getCartQuantity(ctx);

  await ctx.render('checkout', {
    session: ctx.session,
    selected: 'checkout',
    cartQty: cartQty,
    user: user,
    items: orderitems,
    products: products,
    totals: totals,
    subTotal: subTotal,
    grandTotal: grandTotal,
    orderVATSum: orderVATSum,
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
      ctx.body = { 'msg': 'There is not enough quantity of ' + product.name, 'status': 'error' };
      return;
    }
  }

  const user = (await order.getUsers())[0];
  const transaction = await Transaction.create({ type: ctx.request.fields.type });

  // Order complete
  utilsEcom.sendEmail(configEcom.SETTINGS.email_order_sender, user.dataValues.email,
    utilsEcom.parseEmailPlaceholders(configEcom.SETTINGS.email_order_subject, user, order), null,
    utilsEcom.parseEmailPlaceholders(configEcom.SETTINGS.email_order_upper, user, order) +
    (await utilsEcom.getOrderAsTableHTML(order,
      [
        configEcom.SETTINGS.email_order_table_h0,
        configEcom.SETTINGS.email_order_table_h1,
        configEcom.SETTINGS.email_order_table_h2,
        configEcom.SETTINGS.email_order_table_h3
      ],
      { color: configEcom.SETTINGS.email_order_table_border_color, borderweight: configEcom.SETTINGS.email_order_table_border_weight })) +
    utilsEcom.parseEmailPlaceholders(configEcom.SETTINGS.email_order_lower, user, order));

  if (ctx.request.fields.type == "paypal") {
    let responce = await utilsEcom.captureOrder(ctx.request.fields.orderID);

    await transaction.createPaypaltransacion({
      transactionId: responce.result.id,
      orderId: ctx.request.fields.orderID,
      status: responce.result.status,
      emailAddress: responce.result.payer.email_address,
      firstName: responce.result.payer.name.given_name,
      lastName: responce.result.payer.name.surname,
      grossAmount: responce.result.purchase_units[0].payments.captures[0].seller_receivable_breakdown.gross_amount.value,
      paypalFee: responce.result.purchase_units[0].payments.captures[0].seller_receivable_breakdown.paypal_fee.value,
    });

    await utilsEcom.validateStatus(ctx, order.id, responce);
  } else {
    await transaction.createCodtransaction({});

    /*if (!cart) {
      ctx.redirect('/');
      return;
    }*/

    for (let i = 0; i < orderitems.length; i++) {
      orderitems[i].update({ price: (await orderitems[i].getProduct()).discountPrice });
    }

    await order.update({ status: 5, orderedAt: Sequelize.fn('NOW') });

    await utilsEcom.removeProductQtyFromOrder(order);

    ctx.body = { 'msg': 'Your order is completed!', 'status': 'ok' };
  }

  await order.setTransacion(transaction);
});

router.get('/admin/report', async ctx => getAdminReport(ctx));
router.get('/admin/report/:page', async ctx => getAdminReport(ctx));

router.get('/admin/export/report/pdf', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'report.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see reports",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see report without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.timegroup) {
    filters['timegroup'] = ctx.query.timegroup
    filtersToReturn['timegroup'] = ctx.query.timegroup
  } else {
    filtersToReturn['timegroup'] = '2';
  }
  if (ctx.query.ordBefore) {
    filters['ordBefore'] = ctx.query.ordBefore;
    filtersToReturn['ordBefore'] = ctx.query.ordBefore;
  } else {
    filters['ordBefore'] = new Date().toISOString();
  }
  if (ctx.query.ordAfter) {
    filters['ordAfter'] = ctx.query.ordAfter;
    filtersToReturn['ordAfter'] = ctx.query.ordAfter;
  } else {
    filters['ordAfter'] = new Date(0).toISOString();
  }

  let time = 'month';

  switch (filters.timegroup) {
    case '0':
      time = 'day';
      break;
    case '1':
      time = 'week';
      break;
    case '2':
      time = 'month';
      break;
    case '3':
      time = 'year';
      break;
  }

  const reportRes = await utilsEcom.getReportResponce(filters, -1, 0, time);

  const currency = await utilsEcom.getCurrency();

  const path = await utilsEcom.saveReportPdf((await reportRes[0]), filters, time, currency);

  ctx.body = fs.createReadStream(path);

  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} downloaded generated orders report`,
    {
      user: ctx.session.dataValues.staffUsername,
      isStaff: true,
      longMessage:
        `Staff ${ctx.session.dataValues.staffUsername} downloaded generated orders report from ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time} in .pdf format`
    });

  ctx.res.writeHead(200, {
    'Content-Type': 'application/pdf',
    "Content-Disposition": "attachment; filename=reportExcel.pdf",
  });
});

router.get('/admin/export/report/excel', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'report.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see reports",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see report without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });

    ctx.redirect('/admin');
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.timegroup) {
    filters['timegroup'] = ctx.query.timegroup
    filtersToReturn['timegroup'] = ctx.query.timegroup
  } else {
    filtersToReturn['timegroup'] = '2';
  }
  if (ctx.query.ordBefore) {
    filters['ordBefore'] = ctx.query.ordBefore;
    filtersToReturn['ordBefore'] = ctx.query.ordBefore;
  } else {
    filters['ordBefore'] = new Date().toISOString();
  }
  if (ctx.query.ordAfter) {
    filters['ordAfter'] = ctx.query.ordAfter;
    filtersToReturn['ordAfter'] = ctx.query.ordAfter;
  } else {
    filters['ordAfter'] = new Date(0).toISOString();
  }

  let time = 'month';

  switch (filters.timegroup) {
    case '0':
      time = 'day';
      break;
    case '1':
      time = 'week';
      break;
    case '2':
      time = 'month';
      break;
    case '3':
      time = 'year';
      break;
  }

  const reportRes = await utilsEcom.getReportResponce(filters, -1, 0, time);

  const currency = await utilsEcom.getCurrency();

  const path = await utilsEcom.saveReportExcel((await reportRes[0]), filters, time, currency);

  ctx.body = fs.createReadStream(path);

  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} downloaded generated orders report`,
    {
      user: ctx.session.dataValues.staffUsername,
      isStaff: true,
      longMessage:
        `Staff ${ctx.session.dataValues.staffUsername} downloaded generated orders report from ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time} in .xlsx format`
    });

  ctx.res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    "Content-Disposition": "attachment; filename=reportExcel.xlsx",
  });
});

router.get('/admin/export/report/csv', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'report.read')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see reports",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see report without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.timegroup) {
    filters['timegroup'] = ctx.query.timegroup
    filtersToReturn['timegroup'] = ctx.query.timegroup
  } else {
    filtersToReturn['timegroup'] = '2';
  }
  if (ctx.query.ordBefore) {
    filters['ordBefore'] = ctx.query.ordBefore;
    filtersToReturn['ordBefore'] = ctx.query.ordBefore;
  } else {
    filters['ordBefore'] = new Date().toISOString();
  }
  if (ctx.query.ordAfter) {
    filters['ordAfter'] = ctx.query.ordAfter;
    filtersToReturn['ordAfter'] = ctx.query.ordAfter;
  } else {
    filters['ordAfter'] = new Date(0).toISOString();
  }

  let time = 'month';

  switch (filters.timegroup) {
    case '0':
      time = 'day';
      break;
    case '1':
      time = 'week';
      break;
    case '2':
      time = 'month';
      break;
    case '3':
      time = 'year';
      break;
  }

  const reportRes = await utilsEcom.getReportResponce(filters, -1, 0, time);

  const currency = await utilsEcom.getCurrency();

  const path = await utilsEcom.saveReportCsv((await reportRes[0]), filters, time, currency);

  ctx.body = fs.createReadStream(path);

  utilsEcom.logger.log('info',
    `Staff ${ctx.session.dataValues.staffUsername} downloaded generated orders report`,
    {
      user: ctx.session.dataValues.staffUsername,
      isStaff: true,
      longMessage:
        `Staff ${ctx.session.dataValues.staffUsername} downloaded generated orders report from ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time} in .csv format`
    });

  ctx.res.writeHead(200, {
    'Content-Type': 'text/csv',
    "Content-Disposition": "attachment; filename=reportExcel.csv",
  });
});

router.get('/admin/audit', async ctx => getAdminAudit(ctx));
router.get('/admin/audit/:page', async ctx => getAdminAudit(ctx));

router.get('/admin/settings/email', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'settings.email')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see email template settings",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see email template settings without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  await ctx.render('admin/settings/email-templates', {
    layout: 'admin/base',
    selected: 'settings',
    session: ctx.session,
    settings: configEcom.SETTINGS
  });

  // Clear old messages
  ctx.session.messages = null;
});

router.post('/admin/settings/email', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'settings.email')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see email template settings",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see email template settings without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  let table = ctx.request.fields.table;
  let type = ctx.request.fields.type;
  let sender = ctx.request.fields.sender;
  let subject = ctx.request.fields.subject;

  let validTableValues = [
    "name",
    "price",
    "subtotal",
    "quantity",
  ]

  // Check table for empty values
  if (table.includes('-')) {
    ctx.session.messages = { "tableError": type == "payment" ? "Payment email template table has empty values!" : "Order email template table has empty values!" };
    ctx.redirect("/admin/settings/email");

    return;
  }

  // Check table for dublicates
  if ((new Set(table)).size !== table.length) {
    ctx.session.messages = { "tableError": type == "payment" ? "Payment template table has dublicate values!" : "Order template table has dublicate values!" };
    ctx.redirect("/admin/settings/email");

    return;
  }

  // Check table for invalid values
  if (!table.every(elem => validTableValues.includes(elem))) {
    ctx.session.messages = { "tableError": type == "payment" ? "Payment template table has invalid values!" : "Order template table has invalid values!" };
    ctx.redirect("/admin/settings/email");

    return;
  }

  // Check for empty subject
  if (subject == '') {
    ctx.session.messages = { "tableError": type == "payment" ? "Payment template has empty subject!" : "Order template has empty subject!" };
    ctx.redirect("/admin/settings/email");

    return;
  }

  // Check for empty border weight or color
  if (!ctx.request.fields.borderweight || !ctx.request.fields.bordercolor) {
    ctx.session.messages = { "invalidVal": type == "payment" ? "Payment template has invalid table settings!" : "Order template has invalid table settings!" };
    ctx.redirect("/admin/settings/email");

    return;
  }

  // Check for range in border weight
  if (ctx.request.fields.borderweight < 1 ||
    ctx.request.fields.borderweight > 10) {
    ctx.session.messages = { "invalidVal": type == "payment" ? "Payment template has border weight out of range [1-10]!" : "Order template has border weight out of range [1-10]!" };
    ctx.redirect("/admin/settings/email");

    return;
  }

  // Check for valid color
  if (!/^#([0-9A-F]{3}){1,2}$/i.test(ctx.request.fields.bordercolor)) {
    ctx.session.messages = { "invalidVal": type == "payment" ? "Payment template has invalid border color!" : "Order template has invalid border color!" };
    ctx.redirect("/admin/settings/email");

    return;
  }

  /*
  if (!/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/g.test(sender)) {
    ctx.session.messages = { "tableError": type == "payment" ? "Payment email is invalid!" : "Order email is invalid!" };
    ctx.redirect("/admin/settings/email");

    return;
  }
  */

  if (type == "payment")
    await Settings.bulkCreate([
      { type: 'email_payment', key: "email_payment_sender", value: "danielgudjenev@gmail.com" }, // HARD-CODED, FOR NOW
      { type: 'email_payment', key: "email_payment_subject", value: subject },
      { type: 'email_payment', key: "email_payment_upper", value: ctx.request.fields.uppercontent },
      { type: 'email_payment', key: "email_payment_lower", value: ctx.request.fields.lowercontent },
      { type: 'email_payment', key: "email_payment_table_h0", value: table[0] },
      { type: 'email_payment', key: "email_payment_table_h1", value: table[1] },
      { type: 'email_payment', key: "email_payment_table_h2", value: table[2] },
      { type: 'email_payment', key: "email_payment_table_h3", value: table[3] },
      { type: 'email_payment', key: "email_payment_table_border_weight", value: ctx.request.fields.borderweight },
      { type: 'email_payment', key: "email_payment_table_border_color", value: ctx.request.fields.bordercolor },
    ], {
      updateOnDuplicate: ["type", "key", "value"]
    });
  else await Settings.bulkCreate([
    { type: 'email_order', key: "email_order_sender", value: "danielgudjenev@gmail.com" }, // HARD-CODED, FOR NOW
    { type: 'email_order', key: "email_order_subject", value: subject },
    { type: 'email_order', key: "email_order_upper", value: ctx.request.fields.uppercontent },
    { type: 'email_order', key: "email_order_lower", value: ctx.request.fields.lowercontent },
    { type: 'email_order', key: "email_order_table_h0", value: table[0] },
    { type: 'email_order', key: "email_order_table_h1", value: table[1] },
    { type: 'email_order', key: "email_order_table_h2", value: table[2] },
    { type: 'email_order', key: "email_order_table_h3", value: table[3] },
    { type: 'email_order', key: "email_order_table_border_weight", value: ctx.request.fields.borderweight },
    { type: 'email_order', key: "email_order_table_border_color", value: ctx.request.fields.bordercolor },
  ], {
    updateOnDuplicate: ["type", "key", "value"]
  });

  await configEcom.loadSettings(Settings.findAll());

  ctx.session.messages = { "emailOk": type == "payment" ? "Payment template is set!" : "Order template is set!" };
  ctx.redirect("/admin/settings/email");
});

router.get('/admin/settings/other', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'settings.other')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see other settings",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see other settings without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  await ctx.render('admin/settings/other-settings', {
    layout: 'admin/base',
    selected: 'settings',
    session: ctx.session,
    settings: configEcom.SETTINGS,
  });

  // Clear old messages
  ctx.session.messages = null;
});

router.post('/admin/settings/other', async ctx => {
  // Check for admin rights
  if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
    utilsEcom.onNotAuthenticatedStaff(ctx);
    return;
  }

  if (!await utilsEcom.hasPermission(ctx, 'settings.other')) {
    utilsEcom.onNoPermission(ctx,
      "You don\'t have permission to see other settings",
      {
        level: "info",
        message: `Staff ${ctx.session.dataValues.staffUsername} tried to see other settings without rights`,
        options:
        {
          user: ctx.session.dataValues.staffUsername,
          isStaff: true
        }
      });
    return;
  }

  let staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

  // Auto session expire
  if (utilsEcom.isSessionValid(staff)) {
    utilsEcom.onSessionExpired(ctx);

    return;
  } else {
    await staff.update({
      lastActivity: Sequelize.fn("NOW")
    });
  }

  if (ctx.request.fields.pagint) {
    // Validate values
    if (parseInt(ctx.request.fields.pagint) < 1 ||
      parseInt(ctx.request.fields.pagint) > 1000) {
      ctx.session.messages = { "invalidVal": "Pagination number must be in range [1-1000]" };

      ctx.redirect("/admin/settings/other");
      return;
    }

    await Settings.upsert({
      type: "settings",
      key: "elements_per_page",
      value: parseInt(ctx.request.fields.pagint)
    });
  } else if (ctx.request.fields.expire) {
    // Validate values
    if (parseInt(ctx.request.fields.expire) < 0 ||
      parseInt(ctx.request.fields.expire) > 1440) {
      ctx.session.messages = { "invalidVal": "Back-office expire time must be between [0-1440] minutes" };

      ctx.redirect("/admin/settings/other");
      return;
    }

    await Settings.upsert({
      type: "settings",
      key: "backoffice_expire",
      value: parseInt(ctx.request.fields.expire)
    });
  }

  await configEcom.loadSettings(Settings.findAll());

  ctx.session.messages = { 'settingsOK': 'Settings changed!' };
  ctx.redirect('/admin/settings/other');
});

/* WARNING: 
   The session can be null at any request
   I don't fking know why, but check for empty session
   on each request
*/

app.use(session({
  store: utilsEcom.configPostgreSessions(),
  key: process.env.COOKIE_SECRET,
  maxAge: configEcom.SESSION_MAX_AGE,
  renew: true
}, app));

app.use(serve('./static'));

app.use(KoaBodyParser());

render(app, {
  root: path.join(__dirname, "templates"),
  layout: "base",
  viewExt: "html",
  debug: false,
  cache: true,
  async: true,
});

app.use(router.routes()).use(router.allowedMethods());

// Global Unhandled Error Handler
app.on("error", (err, ctx) => {
  utilsEcom.handleError(err, ctx);
});

// app.listen(3210);

app.listen(process.env.PORT);