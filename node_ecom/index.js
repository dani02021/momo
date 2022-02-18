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
  // Clear old messages
  ctx.session.messages = null;

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
        if(user == null)
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
    }
  }
}

router.get("/", async ctx => getIndex(ctx));

router.get("/products", async ctx => getProducts(ctx));

router.get("/products/:page", async ctx => getProducts(ctx));

router.get("/register", async ctx => {
  await ctx.render('register', { session: ctx.session });
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
    await ctx.render('register')
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
      if(user == null) 
      {
        await ctx.redirect("/admin/login");
      } else 
      {
        await ctx.render('/admin/index', {
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
        if (user) 
        {
          await user.update({
            lastLogin: Sequelize.NOW
          });

          await ctx.redirect('/admin');
        }
      });
  }

  await ctx.render('/admin/login', { layout: "/admin/base", session: ctx.session });
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

  if(price > 9999.99 || price < 0 || discountPrice > 9999.99 || discountPrice < 0) 
  {
    ctx.session.messages = {'productErrorPrice': 'Product has invalid price (0 - 9999.99)'};
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

  if(ctx.request.fields.hide == 'on') 
  {
    defaultParams.hide = true;
  } else 
  {
    defaultParams.hide = false;
  }

  const [product, created] = await Product.findOrCreate({
    where: {
      name: ctx.request.fields.name
    },
    defaults: defaultParams
  });

  if(!created) 
  {
    console.log(product);
    ctx.session.messages = {'productExist': `The product with name: ${ctx.request.fields.name} already exists!`};
    ctx.redirect('/admin/products');
  }
  else 
  {
    if(ctx.request.files.length && ctx.request.files[0].size != 0) 
    {
      fs.renameSync(ctx.request.files[0].path + '', __dirname + '/static/media/id' + product.id + '/' + ctx.request.files[0].name, function (err) {
      if (err)
        throw err;
      });

      await product.update({
        image: 'id' + product.id + '/' + ctx.request.files[0].name
      });
    }
  }
  ctx.session.messages = {'productCreated': `Product with id ${product.id} has been created!`};
  await ctx.redirect('/admin/products');
  /*
  image = request.FILES.get('image', '')
    name = request.POST.get('name', '')
    category = request.POST.get('category', '')
    price = request.POST.get('price', '')
    discount_price = request.POST.get('discount-price', '')
    quantity = request.POST.get('quantity', '')
    description = request.POST.get('description', '')
    hide = request.POST.get('hide', '')
        
    # Check the values
    try:
        if float(price) > 9999.99 or float(price) < 0 \
            or float(discount_price) > 9999.99 or float(discount_price) < 0:
            messages.error(request, 'product_edit_error_price')
            return redirect('adminProducts')
    except Exception as e:
        traceback.print_exc()
        messages.error(request, 'product_edit_error_unknown')
        return redirect('adminProducts')
    
    if hide == 'on':
        hide = True
    else:
        hide = False

    product = Product.objects.create(name = name, category=Category.objects.get(id=category), price = price, discount_price = discount_price, quantity = quantity, description = description, hide = hide)
    
    productid = product.id

    if image != '':
        # Upload the image
        try:
            os.mkdir(os.path.join(MEDIA_ROOT, 'id'+str(productid)))
        except:
            pass

        # save the uploaded file inside that folder.
        full_filename = os.path.join(MEDIA_ROOT, 'id'+str(productid), image.name)
        fout = open(full_filename, 'wb+')
        file_content = ContentFile( image.read() )
        # Iterate through the chunks.
        for chunk in file_content.chunks():
            fout.write(chunk)
        fout.close()

        product.image = 'id'+str(productid) + os.sep + image.name
        product.save()

    messages.success(request, 'product_created')
    return redirect('adminProducts')
  */
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


router.post('/admin/products/edit/:id', async ctx => {

  // Check the values

  let price = parseFloat(parseFloat(ctx.request.fields.price).toFixed(2));
  let discountPrice = parseFloat(parseFloat(ctx.request.fields.discountPrice).toFixed(2));

  if(price > 9999.99 || price < 0 || discountPrice > 9999.99 || discountPrice < 0) 
  {
    ctx.session.messages = {'productErrorPrice': 'Product has invalid price (0 - 9999.99)'};
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
  if(ctx.request.files.length && ctx.request.files[0].size != 0) 
  {
    console.log(ctx.request.files[0]);
    fs.renameSync(ctx.request.files[0].path + '', __dirname + '/static/media/id' + ctx.params.id + '/' + ctx.request.files[0].name, function (err) {
      if (err)
        throw err;
    });

    updateParams.image = 'id' + ctx.params.id + '/' + ctx.request.files[0].name;
  }

  if(ctx.request.fields.hide == 'on') 
  {
    updateParams.hide = true;
  } else 
  {
    updateParams.hide = false;
  }

  await Product.update(updateParams,
  {
    where: {
      id: ctx.params.id
    }
  });

  ctx.session.messages = {'productEdited': `Product with id ${ctx.params.id} was edited!`}
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