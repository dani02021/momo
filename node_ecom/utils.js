require('dotenv').config();

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const paypal = require('@paypal/checkout-server-sdk');

const environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

const excelJS = require('exceljs');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { id, user } = require('rangen');
const PDFDocument = require('pdfkit-table');
const assert = require('assert/strict');

const {ClientException, NotEnoughQuantityException} = require('./exceptions');
const configEcom = require('./config');
const { Sequelize } = require('./db');
const loggerEcom = require('./logger');
const db = require('./db');
const models = require('./models');

const { Op } = Sequelize;
const Session = models.session();
const Role = models.role();
const User = models.user();
const Staff = models.staff();
const Order = models.order();
const OrderItem = models.orderitem();
const Product = models.product();
const Settings = models.settings();

const EmailTransport = nodemailer.createTransport({
  pool: true,
  service: 'gmail',
  secure: true, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: Buffer.from(process.env.EMAIL_PASS, 'base64').toString('ascii'),
  },
});

EmailTransport.verify((error, _success) => {
  if (error) {
    loggerEcom.handleError(error);
    loggerEcom.logger.log(
      'alert',
      `Email transport cannot establish connection!
        ${error.message}`,
    );
  }
});

function getHost() {
  if (process.env.HEROKU_DB_URI) { return 'https://telebidpro-nodejs-ecommerce.herokuapp.com'; }
  if (process.env.ENV === 'TEST') { return 'http://10.20.1.159:3322'; }
  return 'https://10.20.1.159';
}

/**
 *
 * @param {import('sequelize/dist').Order} cart
 * @param {string} table
 * @param {object} options
 * @return HTML of table
 */
async function getOrderAsTableHTML(cart, table, options) {
  assert(cart instanceof Order);
  assert(table instanceof Array);
  assert(typeof options === 'object');

  const orderitems = await cart.getOrderitems();

  let html = '<table style="width: 100%; border: 1px solid black">';

  if (options) {
    html = `<table style="width: 100%; border:${options.borderweight ? options.borderweight : '1'}px solid;`
            + `border-color: ${options.color ? options.color : 'black'}">`;
  }

  html += `<tr>
        <th style="border: 1px solid black">Name</th>
        <th style="border: 1px solid black">Price</th>
        <th style="border: 1px solid black">Quantity</th>
        <th style="border: 1px solid black">Total Price</th>
        </tr>\n`;

  for (let i = 0; i < orderitems.length; i += 1) {
    const orderitem = orderitems[i];
    const product = await orderitems[i].getProduct();
    const total = await orderitem.getTotalWithVATStr();

    html
            += '<tr>\n';

    for (let z = 0; z < table.length; z += 1) {
      switch (table[z]) {
        case 'name':
          html += `<td style="border: 1px solid black">${product.name}</td>\n`;
          break;
        case 'price':
          html += `<td style="text-align: right; border: 1px solid black">$${await product.getDiscountPriceWithVATStr()}</td>\n`;
          break;
        case 'quantity':
          html += `<td style="text-align: right; border: 1px solid black">${orderitem.quantity}</td>\n`;
          break;
        case 'subtotal':
          html += `<td style="text-align: right; border: 1px solid black">$${total}</td>\n`;
          break;
        default:
          break;
      }
    }

    html += '</tr>\n';
  }

  // Sub Total
  html += '<tr>\n';

  for (z = 0; z < table.length; z++) {
    if (table[z] == 'subtotal') {
      html += `<td style="text-align: right; border: 1px solid black">$${await cart.getTotalStr()}</td>\n`;
    } else if (table[z + 1] == 'subtotal') html += '<td style="border: 1px solid black">Sub Total:</td>\n';
    else html += '<td style="border: 1px solid black"></td>\n';
  }

  // VAT
  html += '<tr>\n';

  for (z = 0; z < table.length; z++) {
    if (table[z] == 'subtotal') {
      html += `<td style="text-align: right; border: 1px solid black">$${await cart.getVATSumStr()}</td>\n`;
    } else if (table[z + 1] == 'subtotal') html += '<td style="border: 1px solid black">VAT:</td>\n';
    else html += '<td style="border: 1px solid black"></td>\n';
  }

  // Grand Total
  html += '<tr>\n';

  for (z = 0; z < table.length; z++) {
    if (table[z] == 'subtotal') {
      html += `<td style="text-align: right; border: 1px solid black">$${await cart.getTotalWithVATStr()}</td>\n`;
    } else if (table[z + 1] == 'subtotal') html += '<td style="border: 1px solid black">Grand Total:</td>\n';
    else html += '<td style="border: 1px solid black"></td>\n';
  }

  html
        += `</tr>
        </table>`;

  return html;
}

function givePages(page, lastPage) {
  assert(typeof page === 'number');
  assert(typeof lastPage === 'number');

  const delta = 1;
  const left = page - delta;
  const right = page + delta + 1;
  const range = [];
  const rangeWithDots = [];
  let l;

  if (page < 1) { page = 1; }
  if (lastPage < 1) { lastPage = 1; }

  for (let i = 1; i <= lastPage; i += 1) {
    if (i == 1 || i == lastPage || i >= left && i < right) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
}

function generateSessionKey() {
  return crypto.randomBytes(20).toString('hex');
}

function generateEmailVerfToken() {
  return crypto.randomBytes(60).toString('hex');
}

function generateVoucherActivateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Email functions
function parseEmailPlaceholders(text, user, order) {
  assert(typeof text === 'string');
  assert(user instanceof User);
  assert(order instanceof Order);

  text = text.replaceAll(/\$user/gi, user.username);
  text = text.replaceAll(/\$orderid/gi, order.id);

  return text;
}

/**
 *
 * @param {string} sender
 * @param {string} email
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 */
async function sendEmail(sender, email, subject, text, html) {
  assert(typeof sender === 'string');
  assert(typeof email === 'string');
  assert(typeof subject === 'string');

  const message = {
    from: sender,
    to: email,
    subject,
  };

  if (text) { message.text = text; }
  if (html) { message.html = html; }

  try {
    EmailTransport.sendMail(message);
  } catch (e) {
    loggerEcom.handleError(e);
  }
}

function configPostgreSessions() {
  return {
    // Get session object by key.
    get: async (key, _maxAge, { rolling }) => {
      let session;
      await Session.findOne({ where: { key } }).then((sessionv) => { session = sessionv; });
      return session;
    },

    // Set session object for key, with a maxAge (in ms).
    set: async (key, session, maxAge, { rolling, changed }) => {
      await Session.upsert({
        key,
        expire: session._expire,
        maxAge,
        messages: session.messages,
        username: session.username,
        staffUsername: session.staffUsername,
      });
    },

    // Destroy session for key.
    destroy: async (key) => await Session.findOne({ where: { key } }).then((session) => session.destroy()),
  };
}

async function isAuthenticatedUser(ctx) {
  if (!ctx || !ctx.session.dataValues) { return false; }

  if (ctx.session.dataValues.username) {
    const user = await User.findOne({ where: { username: ctx.session.dataValues.username } });

    return user != null;
  }

  return false;
}

async function isAuthenticatedStaff(ctx) {
  if (!ctx || !ctx.session.dataValues) { return false; }

  if (ctx.session.dataValues) {
    if (ctx.session.dataValues.staffUsername) {
      const staff = await Staff.findOne(
        { where: { username: ctx.session.dataValues.staffUsername } },
      );

      return staff != null;
    }
  }

  return false;
}

async function getCartQuantity(ctx) {
  if (await isAuthenticatedUser(ctx)) {
    const order = await Order.findOne({
      where: { status: 0 },
      include: [{
        model: User,
        required: true,
        where: {
          username: ctx.session.dataValues.username,
        },
      }],
    });

    if (order) { return (await order.getOrderitems()).length; } return 0;
  }
  if (ctx.cookies.get('products')) { return Object.keys(JSON.parse(ctx.cookies.get('products'))).length; }

  return 0;
}

// PayPal

/**
 *
 * @param {string | number} orderId
 * @param {boolean} debug
 * @return PayPal response object
 */
async function captureOrder(orderId, orderPrice, debug = false) {
  try {
    assert(typeof orderId === 'string' || typeof orderId === 'number');

    const details = new paypal.orders.OrdersGetRequest(orderId);

    const detailsResponse = await paypalClient.execute(details);

    // Check for price
    let payedPrice = parseFloat(detailsResponse.result.purchase_units[0].amount.value);

    // More than 1 cent difference
    if (Math.abs(await sumArrayInPostgres([orderPrice, -payedPrice])) > 0.01)
        { throw new ClientException("Unexpected error occured! Please contact us!", configEcom.ERROR_TYPES.ORDER_PAYMENT_PRICE_DIFF); }

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const response = await paypalClient.execute(request);
    if (debug) {
      console.log(`Status Code: ${response.statusCode}`);
      console.log(`Status: ${response.result.status}`);
      console.log(`Order ID: ${response.result.id}`);
      console.log('Links: ');
      response.result.links.forEach((item, _index) => {
        const { rel } = item;
        const { href } = item;
        const { method } = item;
        const message = `\t${rel}: ${href}\tCall Type: ${method}`;
        console.log(message);
      });
      console.log('Capture Ids:');
      response.result.purchase_units.forEach((item, _index) => {
        item.payments.captures.forEach((item, _index) => {
          console.log(`\t${item.id}`);
        });
      });
      // To toggle print the whole body comment/uncomment the below line
      console.log(JSON.stringify(response.result, null, 4));
    }
    return response;
  } catch (e) {
    if (e instanceof ClientException)
      throw e;

    loggerEcom.handleError(e, { fileOnly: true });

    loggerEcom.logger.log(
      'alert',
      `There was an error while trying to capture paypal order #${orderId}!
                ${e.message}`,
    );
  }

  return null;
}

/**
 *
 * @param {number|string} productid
 * @param {number|string} qty
 * @return 1 if product's qty is bigger, 2 if they are equal, 0 otherwise
 */
async function compareQtyAndProductQty(productid, qty) {
  assert(parseInt(productid, 10) || parseInt(productid, 10) == 0);

  const product = await Product.findOne({ where: { id: productid } });

  if (!product) { return false; }

  comp = 0;

  if (product.quantity > qty) {
    comp = 1;
  } else if (product.quantity == qty) {
    comp = 2;
  }
  return comp;
}

/**
 *
 * @param {import('sequelize/dist').Order} cart
 * @return True if product's quantity is bigger than cart's product's quantity
 */
async function hasEnoughQtyOfProductsOfOrder(cart) {
  assert(cart instanceof Order);

  const cartOrderItems = await cart.getOrderitems();
  for (i = 0; i < cartOrderItems.length; i += 1) {
    const cartProduct = await cartOrderItems[i].getProduct();

    if (cartOrderItems[i].quantity > cartProduct.quantity) { return cartProduct.name; }
  }

  return true;
}

/**
 *
 * @param {import('sequelize/dist').Order} cart
 */
async function addProductQtyFromOrder(cart) {
  assert(cart instanceof Order);

  const cartOrderItems = await cart.getOrderitems();
  for (let i = 0; i < cartOrderItems.length; i += 1) {
    const cartProduct = await cartOrderItems[i].getProduct();

    cartProduct.update({ quantity: cartProduct.quantity + cartOrderItems[i].quantity });
  }
}

/**
 *
 * @param {Order} cart
 */
async function removeProductQtyFromOrder(cart) {
  assert(cart instanceof Order);

  const cartOrderItems = await cart.getOrderitems();
  for (let i = 0; i < cartOrderItems.length; i += 1) {
    const cartProduct = await cartOrderItems[i].getProduct();

    if (cartProduct.quantity < cartOrderItems[i].quantity) {
      const err = new NotEnoughQuantityException(`${cartProduct.name} has only ${cartProduct.quantity} quantity, but order #${cartOrderItems[i].id} is trying to order ${cartOrderItems[i].quantity}!`);

      loggerEcom.logger.log(
        'alert',
        `Not enough quantity for ${cartProduct.name}!
                ${err.message}`,
      );

      throw err;
    }

    cartProduct.update({ quantity: cartProduct.quantity - cartOrderItems[i].quantity });
  }
}

async function validateStatus(ctx, orderId, responce) {
  assert(typeof responce === 'object');
  assert(parseInt(orderId, 10) || parseInt(orderId, 10) == 0);

  if (responce.result.status == 'COMPLETED') {
    // Order is completed
    const user = await User.findOne({
      where: {
        username: ctx.session.dataValues.username,
      },
    });

    const cart = await Order.findOne({
      where: {
        status: 0,
      },
      include: [{
        model: User,
        required: true,
        where: {
          username: ctx.session.dataValues.username,
        },
      }],
    });

    if (!cart) {
      ctx.redirect('/');
      return;
    }

    // Order payed

    sendEmail(
      configEcom.SETTINGS.email_payment_sender,
      user.dataValues.email,
      parseEmailPlaceholders(configEcom.SETTINGS.email_payment_subject, user, cart),
      null,
      parseEmailPlaceholders(configEcom.SETTINGS.email_payment_upper, user, cart)
            + (await getOrderAsTableHTML(
              cart,
              [
                configEcom.SETTINGS.email_payment_table_h0,
                configEcom.SETTINGS.email_payment_table_h1,
                configEcom.SETTINGS.email_payment_table_h2,
                configEcom.SETTINGS.email_payment_table_h3,
              ],
              {
                color: configEcom.SETTINGS.email_payment_table_border_color,
                borderweight: configEcom.SETTINGS.email_payment_table_border_weight,
              },
            ))
            + parseEmailPlaceholders(configEcom.SETTINGS.email_payment_lower, user, cart),
    );

    await cart.update({ status: 1, orderedAt: Sequelize.fn('NOW') });

    const orderitems = await cart.getOrderitems();

    for (let i = 0; i < orderitems.length; i += 1) {
      orderitems[i].update({ price: (await orderitems[i].getProduct()).discountPrice });
    }

    await removeProductQtyFromOrder(cart);

    ctx.body = { msg: 'Your order is completed!', status: 'ok' };
  } else if (responce.result.status === 'VOIDED') {
    // Order is declined
    const user = await User.findOne({
      where: {
        username: ctx.session.dataValues.username,
      },
    });

    const cart = await Order.findOne({
      where: {
        status: 0,
      },
      include: [{
        model: User,
        required: true,
        where: {
          username: ctx.session.dataValues.username,
        },
      }],
    });

    await cart.update({ status: 3, price: await cart.getTotal() });

    ctx.body = { msg: 'The payment has been rejected!', status: 'error' };
  }
}

async function getReportResponce(filters, limit, offset, time) {
  let text =
    `SELECT
        date_trunc($1, orders."orderedAt")                  AS "startDate",
        SUM(orderitems.quantity)                            AS products,
        COUNT(distinct orders.id)                           AS orders,
        SUM( ROUND(
          price * orderitems.quantity
          , 2) )                                    AS subtotal,
        SUM( ROUND(
          price * orderitems.quantity
          , 2) ) * ( 1 + {config.SETTINGS.vat} )    AS grandtotal,
        SUM( ROUND(
          price * orderitems.quantity
          , 2) ) * {config.SETTINGS.vat}            AS vatsum,
        COALESE( SUM("voucherValue"), 0.00)                 AS "vouchersSum",
        COUNT(*) OVER ()                                    AS count
        FROM orders
        INNER JOIN orderitems                           ON orderitems."orderId" = orders.id
        LEFT JOIN
          (SELECT
            orders.id,
            COALESCE(value, 0.00)                 AS "voucherValue"
            FROM orders
            JOIN order_vouchers                     ON order_vouchers."orderId" = orders.id
              JOIN user_vouchers                    ON user_vouchers.id = order_vouchers."userVoucherId"
                JOIN vouchers                       ON user_vouchers."voucherId" = vouchers.id)
            WHERE status > 0
              AND orders."deletedAt" IS NULL
              AND vouchers."deletedAt" IS NULL
              AND orders."orderedAt" BETWEEN $2 AND $3
          ) ord_vch                                   ON orders.id = ord_vch.id
        WHERE status > 0
          AND orders."deletedAt" is NULL
          AND orderitems."deletedAt" is NULL
          AND orders."orderedAt" BETWEEN $2 AND $3
    GROUP BY "startDate"`;

  text += `OFFSET ${offset}`;

  if (limit >= 0) {
    text += ` LIMIT ${limit}`;
  }

  text += ';';

  let query = await db.query(text, {
    type: 'SELECT',
    plain: false,
    model: OrderItem,
    mapToModel: true,
    bind: [time, filters.ordAfter, filters.ordBefore],
  })

  return query
}

function createTempFile(name = 'temp_file', data = '', encoding = 'utf8') {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(os.tmpdir(), 'nodejs-');
    fs.mkdtemp(tempPath, (err, folder) => {
      if (err) { return reject(err); }

      const fileName = path.join(folder, name);

      fs.writeFile(fileName, data, encoding, (errorFile) => {
        if (errorFile) { return reject(errorFile); }

        resolve(fileName);
      });
    });
  });
}

async function getProductsRaw(offset, limit, name, cat, minval, maxval, sort, vat = true) {
  let text = `SELECT * FROM products
    LEFT JOIN (
        SELECT "productId", sum(quantity) FROM orderitems
        GROUP BY "productId"
    ) foo ON "productId" = products.id
    WHERE "deletedAt" IS NULL
    AND hide = false \n`;

  const returnParamsBind = {};

  if (name && name != '') {
    text += ' AND position(upper($name) in upper(name)) > 0 \n';
    returnParamsBind.name = name;
  }

  if (cat && cat != '') {
    text += ' AND "categoryId" = $cat\n';
    returnParamsBind.cat = cat;
  }

  if (minval && minval != 0) {
    if (vat) { text += ` AND "discountPrice" * (1 + ${configEcom.SETTINGS.vat}) >= $minPrice\n`; } else text += ' AND "discountPrice" >= $minPrice\n';

    returnParamsBind.minPrice = minval;
  }

  if (maxval && maxval != 99999) {
    if (vat) { text += ` AND "discountPrice" * (1 + ${configEcom.SETTINGS.vat}) <= $maxPrice\n`; } else text += ' AND "discountPrice" <= $maxPrice\n';

    returnParamsBind.maxPrice = maxval;
  }

  if (sort) {
    if (sort === 'sales') {
      text += ' ORDER BY (sum IS NULL), sum DESC\n';
    } else text += ' ORDER BY "createdAt" DESC\n';
  } else text += ' ORDER BY "createdAt" DESC\n';

  if (offset > 0) {
    text += ` OFFSET ${offset}\n`;
  }

  text += ` LIMIT ${limit}`;

  const returnParams = {
    type: 'SELECT',
    plain: false,
    model: Product,
    bind: returnParamsBind,
  };

  return db.query(text, returnParams);
}

function escapeCSVParam(param) {
  param = param || ''; // Can be undefined or null

  const escapedParam = param.replace(/"/g, '""');

  return `"${escapedParam}"`;
}

async function saveReportCsv(reportRes, filters, time, currency) {
  assert(reportRes instanceof Array);
  assert(typeof filters === 'object');
  assert(typeof time === 'string');
  assert(typeof currency === 'string');

  let dataToWrite = escapeCSVParam(`From ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time}`);

  dataToWrite += '\nStart Date, Orders, Products, Sub Price, VAT, Grand Total, Currency\n';

  for (i = 0; i < reportRes.length; i += 1) {
    dataToWrite
            += `${escapeCSVParam(reportRes[i].dataValues.startDate.toISOString())},${
        escapeCSVParam(reportRes[i].dataValues.orders)},${
        escapeCSVParam(reportRes[i].dataValues.products)},${
        escapeCSVParam(reportRes[i].dataValues.subtotal)},${
        escapeCSVParam(reportRes[i].dataValues.vatsum)},${
        escapeCSVParam(reportRes[i].dataValues.grandtotal)},${
        currency}\n`;
  }

  // Totals
  const absTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.subtotal), 0).toFixed(2);
  const absVATTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.vatsum), 0).toFixed(2);
  const absGrandTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.grandtotal), 0).toFixed(2);

  dataToWrite += `,,,${escapeCSVParam(absTotal)},${escapeCSVParam(absVATTotal)},${escapeCSVParam(absGrandTotal)},${currency}`;

  return createTempFile('excelReport.csv', dataToWrite);
}

async function saveReportPdf(reportRes, filters, time, currency) {
  assert(reportRes instanceof Array);
  assert(typeof filters === 'object');
  assert(typeof time === 'string');
  assert(typeof currency === 'string');

  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  const temp = await createTempFile('excelReport.pdf');
  const rows = [];

  for (i = 0; i < reportRes.length; i += 1) {
    rows.push([reportRes[i].dataValues.startDate.toLocaleDateString('en-GB'),
      reportRes[i].dataValues.orders,
      reportRes[i].dataValues.products,
      reportRes[i].dataValues.subtotal,
      reportRes[i].dataValues.vatsum,
      reportRes[i].dataValues.grandtotal,
      ` ${currency}`]);
  }

  // Total
  const absTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.subtotal), 0).toFixed(2);
  const absVATTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.vatsum), 0).toFixed(2);
  const absGrandTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.grandtotal), 0).toFixed(2);

  rows.push(['', '', '', absTotal, absVATTotal, absGrandTotal, ` ${currency}`]);

  const subtitle = `From ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time}`;

  doc.pipe(fs.createWriteStream(temp));

  const table = {
    title: 'Report Orders',
    subtitle,
    headers: [
      {
        label: 'Start Date',
      },
      {
        label: 'Orders',
        align: 'right',
      },
      {
        label: 'Products',
        align: 'right',
      },
      {
        label: 'Sub Total',
        align: 'right',
      },
      {
        label: 'VAT',
        align: 'right',
      },
      {
        label: 'Grand Total',
        align: 'right',
      },
      {
        label: ' Currency',
      }],
    rows,
  };
  doc.table(table, {
    // columnsSize: [ 200, 100, 100 ],
  });

  doc.end();

  return temp;
}

async function saveReportExcel(reportRes, filters, time, currency) {
  assert(reportRes instanceof Array);
  assert(typeof filters === 'object');
  assert(typeof time === 'string');
  assert(typeof currency === 'string');

  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report Orders');

  worksheet.getRow(2).values = ['Start Date', 'Orders', 'Products', 'Sub Total', 'VAT', 'Grand Total', 'Currency'];

  // Column for data in excel. key must match data key
  worksheet.columns = [
    { header: 'Start Date', key: 'startDate', width: 10 },
    { header: 'Orders', key: 'orders', width: 10 },
    { header: 'Products', key: 'products', width: 10 },
    { header: 'Sub Total', key: 'subtotal', width: 10 },
    { header: 'VAT', key: 'vatsum', width: 10 },
    { header: 'Grand Total', key: 'grandtotal', width: 10 },
    { header: 'Currency', key: 'currency', width: 10 },
  ];

  reportRes.forEach((report) => {
    const data = [
      report.dataValues.startDate.toLocaleDateString('en-GB'),
      parseInt(report.dataValues.orders, 10),
      parseInt(report.dataValues.products, 10),
      parseFloat(report.dataValues.subtotal),
      parseFloat(report.dataValues.vatsum),
      parseFloat(report.dataValues.grandtotal),
      currency];

    worksheet.addRow(data);
  });

  worksheet.addRow([
    '',
    '',
    '',
    parseFloat(
      reportRes.reduce((partialSum, a) => parseFloat(partialSum)
                    + parseFloat(a.dataValues.subtotal), 0)
        .toFixed(2),
    ),
    parseFloat(
      reportRes.reduce((partialSum, a) => parseFloat(partialSum)
                    + parseFloat(a.dataValues.vatsum), 0)
        .toFixed(2),
    ),
    parseFloat(
      reportRes.reduce((partialSum, a) => parseFloat(partialSum)
                    + parseFloat(a.dataValues.grandtotal), 0)
        .toFixed(2),
    ),
    currency]);

  // TITLE
  worksheet.mergeCells('A1', 'G1');
  worksheet.getCell('A1').value = `From ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time}`;

  // Make first row bold
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
  });

  // Make second row bold
  worksheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true };
  });

  // await workbook.xlsx.writeFile(`${path}/users.xlsx`);

  const buffer = await workbook.xlsx.writeBuffer();

  return createTempFile('excel_report.xlsx', buffer);
}

/**
 * Generate rows from Worksheet
 * @param {import('exceljs').Worksheet} worksheet
 */
function* rowSequence(worksheet) {
  for (let i = 1; i <= worksheet.rowCount; i += 1) {
    const row = worksheet.getRow(i);

    yield {
      index: i,
      data: row,
    };
  }
}

// Returns every product and how many times its ordered - NOT USED - NOT WORKING
async function getProductsAndOrderCount(offset, limit, name, cat, minval, maxval) {
  let text = `SELECT products.id, products.name, products.description, products.image,
            products.price, products."discountPrice", products."categoryId",
            products."createdAt", products."deletedAt", count
        FROM products
        INNER JOIN (
            SELECT products.name, count(products.name)
            FROM orderitems
            INNER JOIN products on products.id = orderitems."productId"
            GROUP BY products.name order by count desc
        ) AS foo on products.name = foo.name
        WHERE products."deletedAt" IS NULL
            AND products.hide = false`;

  const bindParams = {};

  if (name != '' || cat != '' || minval != 0 || maxval != 99999) {
    if (name && name != '') {
      text += ' AND position(upper($name) in upper(name)) > 0 \n';
      bindParams.name = name;
    }

    if (cat && cat != '') {
      text += ' AND "categoryId" = $cat\n';
      bindParams.cat = cat;
    }

    if (minval && minval != 0) {
      text += ' AND "discountPrice" >= $minPrice\n';
      bindParams.minPrice = minPrice;
    }

    if (maxval && maxval != 99999) {
      text += ' AND "discountPrice" <= $maxPrice\n';
      bindParams.maxPrice = maxval;
    }
  }

  text += ' ORDER BY count DESC';

  if (offset > 0) {
    text += ` OFFSET ${offset}\n`;
  }

  text += ` LIMIT ${limit}`;

  return [db.query(text, {
    type: 'SELECT',
    plain: false,
    model: Product,
  }),
  db.query('SELECT count(*) FROM products', {
    type: 'SELECT',
    plain: false,
    model: Product,
  }),
  ];
}

function isSessionValid(staff) {
  // assert(staff instanceof Staff);

  // Staff not found
  if (!staff) { return false; }

  if (!staff.lastActivity) { return true; }

  if (configEcom.SETTINGS.backoffice_expire == 0) { return true; }

  return new Date() - new Date(staff.lastActivity) < configEcom.SETTINGS.backoffice_expire * 60 * 1000;
}

// Other

/**
 *
 * @param {object} obj1
 * @param {object} obj2
 *
 * @return Combined values of the same keys.
 * If key exists only in one object, it will be
 * added to the combined object.
 * If values are strings they will be appended,
 * if values are numbers they will be sumed.
 * If parseNum is true, then all values are parsed as int
 */
function combineTwoObjects(obj1, obj2, parseNum) {
  assert(typeof obj1 === 'object');
  assert(typeof obj2 === 'object');

  const obj3 = obj1;

  for (key in obj1) {
    const keytwo = obj2[key];

    if (keytwo) {
      if (parseNum) { obj3[key] = (parseInt(obj3[key], 10) + parseInt(obj2[key], 10)).toString(); } else obj3[key] += obj2[key];
    }
  }

  for (key in obj2) {
    const keyone = obj3[key];

    if (!keyone) {
      obj3[key] = obj2[key];
    }
  }

  return obj3;
}

/**
 * @async
 * @return Currency, as saved in the DB or if not set, default hard-coded currency
 */
async function getCurrency() {
  return configEcom.SETTINGS.currency;
}

function getAge(dateString) {
  assert(typeof dateString === 'string');

  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

// Generate

// WARN:
// Remove all orders without orderitems
// Remove all orders without user
// Remove all orderitems without products
// Remove all orderitems without order
async function generateOrders(x = 100) {
  const products = await Product.findAll();
  const users = await User.findAll();

  for (let o = 0; o < x; o += 1) {
    const order = await Order.create({
      status: 1,
      orderedAt: new Date(+(new Date()) - Math.floor(Math.random() * 900000000000)),
    });

    for (i = 0; i <= Math.floor(Math.random() * 3) + 1; i += 1) {
      // Get product
      const product = products[Math.floor(Math.random() * 10000) + 1];

      const orderitem = await OrderItem.create({
        quantity: Math.floor(Math.random() * 3) + 1,
      });

      await orderitem.setProduct(product);

      await orderitem.update({ price: product.discountPrice });

      await order.addOrderitem(orderitem);

      const user = users[Math.floor(Math.random() * 10_000) + 1];

      user.addOrder(order);
    }
  }
}

async function generateStaff(x = 100) {
  const testUsers = user({
    count: x,
  });

  for (o = 0; o < x; o++) {
    Staff.create({
      username: id(),
      email: id() + testUsers[o].email,
      password: id() + id() + id(),
      firstName: testUsers[o].name.first,
      lastName: testUsers[o].name.last,
    });
  }
}

async function generateUsers(x = 100) {
  const testUsers = user({
    count: x,
  });

  for (let o = 0; o < x; o += 1) {
    const token = generateEmailVerfToken();

    await User.create({
      username: id(),
      email: id() + testUsers[o].email,
      password: ( id() + token).substring(0, 30),
      firstName: testUsers[o].name.first,
      lastName: testUsers[o].name.last,
      address: 'Bulgaria',
      country: 'Bulgaria',
      emailConfirmed: true,
      verificationToken: token,
      gender: 'Male',
      birthday: ~~new Date(Math.random() * 900000000000)
    });
  }
}

async function generateLogs(x = 100) {
  const users = await User.findAll();
  const staffs = await Staff.findAll();
  const orders = await Order.findAll({ where: { status: { [Op.gte]: 1 } } });

  for (o = 0; o < x; o++) {
    const rand = Math.floor(Math.random() * 8);

    const user = users[Math.floor(Math.random() * 10000) + 1];
    const staff = staffs[Math.floor(Math.random() * 10000) + 1];
    const order = orders[Math.floor(Math.random() * 10000) + 1];

    switch (rand) {
      case 0:
        const date1 = new Date(+(new Date()) - Math.floor(Math.random() * 900000000000));
        const date2 = new Date(+(date1) - Math.floor(Math.random() * 10000000000));

        loggerEcom.logger.log(
          'info',
          `Staff ${staff.username} downloaded generated orders report from ${date1.toISOString()} to ${date2.toISOString()} trunced by month in .csv format`,
          { user: staff.username },
        );
        break;
      case 1:
        loggerEcom.logger.log(
          'info',
          `Staff ${staff.username} tried to see report without rights`,
          { user: staff.username },
        );
        break;
      case 2:
        loggerEcom.logger.log(
          'info',
          `Staff ${staff.username} updated status of order #${order.id} from ${STATUS_DISPLAY[1]} to ${STATUS_DISPLAY[Math.floor(Math.random() * 5)]}`,
          { user: staff.username },
        );
        break;
      case 3:
        loggerEcom.logger.log(
          'info',
          `Staff ${staff.username} tried to log in with invalid password!`,
          { user: staff.username },
        );
        break;
      case 4:
        loggerEcom.logger.log(
          'info',
          `User ${user.username} logged in!`,
          { user: user.username },
        );
        break;
      case 5:
        loggerEcom.logger.log(
          'info',
          `User ${user.username} logged out!`,
          { user: user.username },
        );
        break;
      case 6:
        loggerEcom.logger.log(
          'alert',
          `There was an error while trying to capture paypal order #${order.id}!`,
        );
        break;
      case 7:
        loggerEcom.logger.log(
          'alert',
          `Not enough quantity for ${(await order.getOrderitems())[0].name}!`,
        );
    }
  }
} // tb-office-23

// generateUsers(1000);

// generateOrders(80000);

// Events

/**
 *
 * @param {import('koa').Context} ctx
 * @param {string} redirectLoc
 */
function onNotAuthenticatedStaff(ctx, message = 'You are not logged in as staff!', redirectLoc = '/admin/login') {
  assert(typeof redirectLoc === 'string');
  assert(typeof message === 'string');

  if (ctx.request.fields && ctx.request.fields.isAJAX) { ctx.body = { error: message }; } else {
    ctx.session.messages = { noPermission: message };
    ctx.redirect(redirectLoc);
  }
}

/**
 *
 * @param {import('koa').Context} ctx
 * @param {string} message
 * @param {string} redirectLoc
 */
function onNotAuthenticatedUser(ctx, message = 'You are not logged in as user!', redirectLoc = '/') {
  assert(typeof redirectLoc === 'string');
  assert(typeof message === 'string');

  if (ctx.request.fields && ctx.request.fields.isAJAX) { ctx.body = { error: message }; } else {
    ctx.session.messages = { noPermission: message };
    ctx.redirect(redirectLoc);
  }
}

function onSessionExpired(ctx, message = 'Session expired!', redirectLoc = '/admin/login') {
  assert(typeof redirectLoc === 'string');
  assert(typeof message === 'string');

  if (ctx.request.fields && ctx.request.fields.isAJAX) { ctx.body = { error: message }; } else {
    ctx.session.messages = { sessionExpired: message };
    ctx.session.staffUsername = null;
    ctx.redirect(redirectLoc);
  }
}

// ExcelJS
function isRichValue(value) {
  return Boolean(value && Array.isArray(value.richText));
}

function richToString(value) {
  if (!isRichValue(value)) { return value; }

  return value.richText.map(({ text }) => text).join('');
}

/**
 * Sums the array, if the sum < 0, return 0
 * @param {object} array
 * @returns
 */
async function sumArrayInPostgres(array) {
  return (await db.query(
    `SELECT
      GREATEST(SUM(values), 0.00)            AS total
    FROM
      UNNEST(ARRAY [${array.toString()}]::decimal[])    AS values`, {
        mapToModel: false,
        plain: true,
        type: 'SELECT'
      }
  )).total;
}

// Settings
configEcom.loadSettings(Settings.findAll());

/*
def validate_status(request, uid, order_id, order):
    elif order.result.status == 'PAYER_ACTION_REQUIRED':
        # Additional action from the user is required
        ecom_user = models.EcomUser.objects.get(user=request.user)

        cart = models.Order.objects.filter(
            user=ecom_user, status=models.Order.OrderStatus.NOT_ORDERED)[0]
        cart.status = models.Order.OrderStatus.PAYER_ACTION_REQUIRED
        cart.save()

        for link in order.result.links:
            if link.rel == 'payer-action':
                return JsonResponse({'msg': 'Additional action is required! (3DS Auth?) Please click \
                    <a href='+link.href+' target="_blank" rel="noopener noreferrer">here</a>!', 'status': 'alert'})

        # This should not happen
        return JsonResponse({'msg': 'Internal server error happened! Please contact support! Transaction ID: '+order_id, 'status':'error'})
    elif order.result.status == 'CREATED' or \
        order.result.status == 'SAVED' or \
        order.result.status == 'APPROVED':
            # Try again after short period
            time.sleep(3)
            uid, order = capture_order(order_id)

            # Don't change the status of the order

            if order.result.status != 'CREATED' and \
                order.result.status != 'SAVED' and \
                order.result.status != 'APPROVED':
                    return validate_status(request, uid, order_id, order)

            return JsonResponse({'msg': 'There was an error while processing your order! Please contact support! Transaction ID: ' + order_id, 'status': 'error'})
*/

module.exports = {
  getHost,
  givePages,
  generateEmailVerfToken,
  generateSessionKey,
  generateVoucherActivateToken,
  configPostgreSessions,
  parseEmailPlaceholders,
  sendEmail,
  getOrderAsTableHTML,
  isSessionValid,
  isAuthenticatedStaff,
  isAuthenticatedUser,
  captureOrder,
  validateStatus,
  getCartQuantity,
  compareQtyAndProductQty,
  hasEnoughQtyOfProductsOfOrder,
  addProductQtyFromOrder,
  removeProductQtyFromOrder,
  getReportResponce,
  getProductsRaw,
  getProductsAndOrderCount,
  rowSequence,
  saveReportCsv,
  saveReportExcel,
  saveReportPdf,
  createTempFile,
  combineTwoObjects,
  getCurrency,
  getAge,
  onNotAuthenticatedStaff,
  onNotAuthenticatedUser,
  onSessionExpired,
  isRichValue,
  richToString,
  sumArrayInPostgres,
};
