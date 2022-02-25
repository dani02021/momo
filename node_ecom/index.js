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

require('dotenv').config();

const { Sequelize } = require("sequelize");
const Op = Sequelize.Op;

const models = require("./models.js");
const Category = models.category();
const Product = models.product();
const User = models.user();
const Staff = models.staff();
const Session = models.session();
const Role = models.role();

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
    session: ctx.session
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
    lastPage: count,
    pages: utilsEcom.givePages(page, Math.ceil(count / utilsEcom.PRODUCTS_PER_PAGE))
  });
}

async function getAdminProducts(ctx) {
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

  if (ctx.session.dataValues.username) {
    await Staff.findOne({
      where: {
        username: ctx.session.dataValues.username
      },
      include: Role
    })
      .then(async user => {
        if (user == null)
          return;
        
        await user.getRoles().then(async roles => {
          for (i = 0; i < roles.length; i++) {
            await roles[i].getPermissions().then(async perms => {
              for (y = 0; y < perms.length; y++) {
                if (perms[y].name == 'products.read') {
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
                    lastPage: count,
                    pages: utilsEcom.givePages(page, Math.ceil(count / utilsEcom.PRODUCTS_PER_PAGE))
                  });

                  permFound = true;
                }
              }
            });
          }
        });
      });

    if (!permFound) {
      ctx.session.messages = { 'noPermission': 'You don\'t have permission to see products' }
      await ctx.redirect('/admin');
    } else {
      // Clear old messages
      ctx.session.messages = null;
    }
  }
}

async function getAdminAccounts(ctx) {
  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.user) {
    filters['user'] = ctx.query.user;
    filtersToReturn['user'] = ctx.query.user;
  } else 
  {
    filters['user'] = '';
  }
  if (ctx.query.email) {
    filters['email'] = ctx.query.email;
    filtersToReturn['email'] = ctx.query.email;
  } else 
  {
    filters['email'] = '';
  }
  if (ctx.query.country) {
    filters['country'] = ctx.query.country;
    filtersToReturn['country'] = ctx.query.country;
  } else 
  {
    filters['country'] = '';
  }

  let page = 1;

  if (ctx.params.page) {
    page = parseInt(ctx.params.page)
  }

  let limit = utilsEcom.PRODUCTS_PER_PAGE;
  let offset = 0;

  if (ctx.params.page) {
    console.log(ctx.params.page);
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
    lastPage: result.count,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / utilsEcom.PRODUCTS_PER_PAGE))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminStaffs(ctx) {
  // Get filters
  let filters = {}, filtersToReturn = {};

  if (ctx.query.user) {
    filters['user'] = ctx.query.user;
    filtersToReturn['user'] = ctx.query.user;
  } else 
  {
    filters['user'] = '';
  }
  if (ctx.query.email) {
    filters['email'] = ctx.query.email;
    filtersToReturn['email'] = ctx.query.email;
  } else 
  {
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
    lastPage: result.count,
    pages: utilsEcom.givePages(page, Math.ceil(result.count / utilsEcom.PRODUCTS_PER_PAGE))
  });

  // Clear the messages
  ctx.session.messages = null;
}

async function getAdminRoles(ctx) 
{
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
    lastPage: result.count,
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
    session: ctx.session
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

      userv.update({
        lastLogin: Sequelize.NOW
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
  // Clear old messages
  ctx.session.messages = null;

  if (ctx.session.dataValues.username) {
    await Staff.findOne({ where: { username: ctx.session.dataValues.username }, include: Role }).then(async user => {
      if (user == null) {
        await ctx.redirect("/admin/login");
      } else {
        await ctx.render('/admin/index', {
          selected: 'dashboard',
          session: ctx.session,
          user: user,
          layout: "/admin/base"
        });
      }
    });
  }
  else ctx.redirect("/admin/login");
});

router.get('/admin/login', async ctx => {
  // Clear old messages
  ctx.session.messages = null;

  if (ctx.session.dataValues.username) {
    await Staff.findOne({
      where: {
        username: ctx.session.dataValues.username
      },
      include: Role
    })
      .then(async user => {
        if (user) {
          await user.update({
            lastLogin: Sequelize.NOW
          });

          await ctx.redirect('/admin');
        }
      });
  }

  await ctx.render('/admin/login', { layout: "/admin/base", selected: 'login', session: ctx.session });
});

router.post('/admin/login', async ctx => {
  let userFound = false;

  await Staff.findOne({
    where: {
      username: ctx.request.fields.username
    }, include: Role
  }).then(userv => {
    if (!userv)
      return;

    if (userv.authenticate(ctx.request.fields.password)) {
      let messages = { 'loginSuccess': 'Successful login!' };
      ctx.session.messages = messages;
      ctx.session.username = ctx.request.fields.username;
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

  // Clear the messages
  ctx.session.messages = null;

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
      product: product,
      categories: categories
    });
  });
});

router.get('/admin/accounts', async ctx => getAdminAccounts(ctx));
router.get('/admin/accounts/:page', async ctx => getAdminAccounts(ctx));

router.post('/admin/accounts/delete', async ctx => {
  ids = ctx.request.fields.id;

  await User.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'accountDeleted': 'All products are successfuly deleted!' }

  ctx.redirect('/admin/accounts');
});

router.get('/admin/accounts/edit/:id', async ctx => {
  const user = await User.findOne({where: {id: ctx.params.id }}); 

  await ctx.render('admin/edit-account', {
    layout: 'admin/base',
    session: ctx.session,
    selected: 'accounts',
    user: user
  });
});

router.post('/admin/accounts/edit/:id', async ctx => {

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
  await ctx.redirect('/admin/accounts/edit/' + ctx.params.id);
});

router.post('/admin/accounts/add', async ctx => {
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
  ids = ctx.request.fields.id;

  await Staff.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'staffDeleted': 'All products are successfuly deleted!' }

  ctx.redirect('/admin/staff');
});

router.get('/admin/staff/edit/:id', async ctx => {
  const staff = await Staff.findOne({where: {id: ctx.params.id }});
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

  let updateParams = {
    username: ctx.request.fields.name,
    email: ctx.request.fields.email
  }

  const staff = await Staff.findOne({where: {id: ctx.params.id }});

  staff.update(updateParams).catch(function (err) {
      console.log(err);
  });
  
  await staff.removeRoles(await staff.getRoles());

  if (ctx.request.fields.role instanceof Array) 
  {
    for(roleid in ctx.request.fields.role) 
    {
      const role = await Role.findOne({where: { id: roleid } }); 
      await staff.addRole(role);
    }
  } else if (ctx.request.fields.role)
  {
    const role = await Role.findOne({where: { id: ctx.request.fields.role } }); 
    await staff.addRole(role);
  }
  ctx.session.messages = { 'staffEdited': `Staff with id ${ctx.params.id} was edited!` }
  await ctx.redirect('/admin/staff/edit/' + ctx.params.id);
});

router.post('/admin/products/edit/:id', async ctx => {

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

  ctx.session.messages = { 'productEdited': `Product with id ${ctx.params.id} was edited!` }
  await ctx.redirect('/admin/products/edit/' + ctx.params.id);
});

router.post('/admin/products/delete', async ctx => {
  ids = ctx.request.fields.id;

  await Product.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'productDeleted': 'All products are successfuly deleted!' }

  ctx.redirect('/admin/products');
});

router.post('/admin/products/delete', async ctx => {
  ids = ctx.request.fields.id;

  await Product.destroy({
    where: {
      id: ids
    }
  });

  ctx.session.messages = { 'productDeleted': 'All products are successfuly deleted!' }

  ctx.redirect('/admin/products');
});

router.post('/admin/categories/add', async ctx => {
  await Category.findOrCreate({
    where: {
      name: ctx.request.fields.name,
      imageCss: ctx.request.fields.image
    }
  });

  await ctx.redirect('/admin/products')
});

router.post('/admin/categories/remove', async ctx => {
  await Category.destroy({
    where: {
      id: ctx.request.fields.id
    }
  });

  await ctx.redirect('/admin/products');
});

router.get('/admin/roles', async ctx => getAdminRoles(ctx));
router.get('/admin/roles/:page', async ctx => getAdminRoles(ctx));


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