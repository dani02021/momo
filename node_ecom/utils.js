require('dotenv').config();

const crypto = require('crypto');
const nodemailer = require("nodemailer");
const winston = require('winston');
const paypal = require('@paypal/checkout-server-sdk');
const WinstonTransport = require('winston-transport');
let environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
let paypalClient = new paypal.core.PayPalHttpClient(environment);

const models = require("./models.js");
const { Sequelize } = require('./db.js');
const Op = Sequelize.Op;
const Session = models.session();
const Staff = models.staff();
const Role = models.role();
const User = models.user();
const Order = models.order();
const OrderItem = models.orderitem();
const Product = models.product();
const Log = models.log();
const Settings = models.settings();

const fs = require('fs');
const os = require('os');
const path = require('path');
const PDFDocument = require('pdfkit-table');
const assert = require('assert/strict');

const { id, user } = require('rangen');

const db = require("./db.js");

const excelJS = require("exceljs");

const SESSION_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks

let PRODUCTS_PER_PAGE = 12;
let SESSION_BACK_OFFICE_EXPIRE = 5 * 60 * 1000; // 5 minutes

const DEFAULT_PAYMENT_EMAIL_TEMPLATE = {
    email_payment_sender: 'danielgudjenev@gmail.com',
    email_payment_subject: 'Платена поръчка #$orderid',
    email_payment_upper: '$user, вашата поръчка #$orderid беше платена успешно',
    email_payment_table: 'name,price,quantity,subtotal',
    email_payment_lower: 'Благодаря за вашата поръчка'
}

const DEFAULT_ORDER_EMAIL_TEMPLATE = {
    email_order_sender: 'danielgudjenev@gmail.com',
    email_order_subject: 'Регистрирана поръчка #$orderid',
    email_order_upper: '$user, вашата поръчка #$orderid беше регистрирана успешно',
    email_order_table: 'name,price,quantity,subtotal',
    email_order_lower: 'Благодаря за вашата поръчка'
}

const STATUS_DISPLAY = [
    "Not Ordered",
    "Pending",
    "Shipped",
    "Declined",
    "Completed",
    "Not payed",
    "Payer action needed"
]
const LOG_LEVELS = {
    alert: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
    debug: 5
}

// Exceptions
class NotEnoughQuantityException extends Error {
    constructor(message) {
        super(message);
        this.name = "NotEnoughQuantityException";
        this.code = "NOT_ENOUGH_QUANTITY";
    }
}

const EmailTransport = nodemailer.createTransport({
    pool: true,
    service: 'gmail',
    secure: true, // use TLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: Buffer.from(process.env.EMAIL_PASS, "base64").toString('ascii'),
    },
});

EmailTransport.verify(function (error, success) {
    if (error) {
        handleError(error);
        logger.log('alert',
            `Email transport cannot be verified!
        ${error.message}`);
    }
});

class SequelizeTransport extends WinstonTransport {
    constructor(opts) {
        super(opts);
        //
        // Consume any custom options here. e.g.:
        // - Connection information for databases
        // - Authentication information for APIs (e.g. loggly, papertrail,
        //   logentries, etc.).
        //
    }

    log(info, callback) {
        if (info.fileOnly)
            return;

        setImmediate(() => {
            this.emit('logged', info);
        });

        let user = "";

        if (info.user)
            user = info.user;

        Log.create({
            timestamp: new Date().toISOString(), user: user,
            level: info.level, message: info.message,
            longMessage: info.longMessage, isStaff: info.isStaff
        });

        // Perform the writing to the remote service
        callback();
    }
};

const logger = winston.createLogger({
    levels: LOG_LEVELS,
    transports: [
        new SequelizeTransport({
            level: "debug"
        }),
        new winston.transports.File({
            level: "error",
            // Create the log directory if it does not exist
            filename: 'logs/error.log',
            format: winston.format.printf(log => `[${new Date().toString()}] ` + log.message),
        }),
        new winston.transports.File({
            level: "error",
            // Create the log directory if it does not exist
            filename: 'logs/fullerror.log',
            format: winston.format.printf(log => `[${new Date().toString()}] ` + log.stacktrace),
        })
    ]
});

function getHost() {
    return (process.env.HEROKU_DB_URI ? `telebidpro-nodejs-ecommerce.herokuapp.com` : '10.20.1.159');
}

async function getOrderAsTableHTML(cart, emailtemplate) {
    assert(cart);
    assert(emailtemplate);

    let orderitems = await cart.getOrderitems();
    let absTotal = 0.0;
    let template = emailtemplate.table.split(",");

    let html =
        `<table style="width: 100%; border: 1px solid black">
    <tr>
    <th style="border: 1px solid black">Name</th>
    <th style="border: 1px solid black">Price</th>
    <th style="border: 1px solid black">Quantity</th>
    <th style="border: 1px solid black">Total Price</th>
    </tr>\n`;

    for (i = 0; i < orderitems.length; i++) {
        let orderitem = orderitems[i];
        let product = await orderitems[i].getProduct();
        let total = await orderitem.getTotal();

        absTotal += total;

        html +=
            `<tr>\n`;

        for(z=0;z<template.length;z++) 
        {
            switch(template[z]) 
            {
                case "name":
                    html += `<td style="border: 1px solid black">${product.name}</td>\n`;
                    break;
                case "price":
                    html += `<td style="text-align: right; border: 1px solid black">$${product.discountPrice}</td>\n`;
                    break;
                case "quantity":
                    html += `<td style="text-align: right; border: 1px solid black">$${product.quantity}</td>\n`;
                    break;
                case "subtotal":
                    html += `<td style="text-align: right; border: 1px solid black">$${total.toFixed(2)}</td>\n`;
                    break;
            }
        }

        html += `</tr>\n`;
    }

    html +=
        `<tr>\n`;
    
    for(z=0;z<template.length;z++) 
    {
        if (template[z] == "subtotal") 
        {
            html += `<td style="text-align: right; border: 1px solid black">$${absTotal.toFixed(2)}</td>\n`;
        } else 
        {
            html += `<td style="border: 1px solid black"></td>\n`;
        }
    }

    html +=
        `</tr>
        </table>`;

    return html;
}

function givePages(page, lastPage) {

    assert(typeof page === "number");
    assert(typeof lastPage === "number");

    var delta = 1,
        left = page - delta,
        right = page + delta + 1,
        range = [],
        rangeWithDots = [],
        l;

    if (page < 1)
        page = 1;
    if (lastPage < 1)
        lastPage = 1;

    for (let i = 1; i <= lastPage; i++) {
        if (i == 1 || i == lastPage || i >= left && i < right) {
            range.push(i);
        }
    }

    for (let i of range) {
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

// Generate email verification token
function generateEmailVerfToken() {
    return crypto.randomBytes(60).toString('hex');
}

// Email functions
function parseEmailPlaceholders(text, user, order) 
{
    assert(user)
    assert(order)

    text = text.replaceAll(/\$user/gi, user.username);
    text = text.replaceAll(/\$orderid/gi, order.id);

    return text;
}
async function sendEmail(sender, email, subject, text, html) 
{
    assert(email);
    assert(subject);

    var message = {
        from: sender,
        to: email,
        subject: subject,
    };

    if (text)
        message["text"] = text;
    if (html)
        message["html"] = html;

    EmailTransport.sendMail(message);
}

function configPostgreSessions() {
    return {
        // Get session object by key. 
        get: async (key, maxAge, { rolling }) => {
            let session;
            await Session.findOne({ where: { key: key } }).then(sessionv => { session = sessionv; })
            return session;
        },

        // Set session object for key, with a maxAge (in ms).
        set: async (key, session, maxAge, { rolling, changed }) => {
            await Session.upsert({
                key: key, expire: session._expire, maxAge: maxAge,
                messages: session.messages, username: session.username, staffUsername: session.staffUsername
            });
        },

        // Destroy session for key.
        destroy: async key =>
            await Session.findOne({ where: { key: key } }).then(session => session.destroy()),
    }
}

async function isAuthenticatedUser(ctx) {
    if (!ctx || !ctx.session.dataValues)
        return false;

    if (ctx.session.dataValues.username) {
        const user = await User.findOne({ where: { username: ctx.session.dataValues.username } });

        return user != null;
    }

    return false;
}
async function isAuthenticatedStaff(ctx) {
    if (!ctx || !ctx.session.dataValues)
        return false;

    if (ctx.session.dataValues) {
        if (ctx.session.dataValues.staffUsername) {
            const staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

            return staff != null;
        }
    }

    return false;
}

/**
 * 
 * @param {*} ctx 
 * @param {string} permission 
 * @returns true if the staff has the permission
 */
async function hasPermission(ctx, permission) {
    assert(ctx);

    const staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername }, include: Role });

    if (staff == null) {
        return false;
    } else {
        /*
            This code reads from db only once, looping thru it doesn't
            send new requests to the db!
        */
        const roles = await staff.getRoles();

        for (let role in roles) {
            const permissions = await roles[role].getPermissions();

            for (let perm in permissions) {
                if (permissions[perm].name == permission) {
                    return true;
                }
            }
        }

        return false;
    }
}

async function getCartQuantity(ctx) {
    if (await isAuthenticatedUser(ctx)) {
        let order = await Order.findOne({
            where: { status: 0 },
            include: [{
                model: User,
                required: true,
                where: {
                    'username': ctx.session.dataValues.username
                }
            }]
        });

        if (order)
            return (await order.getOrderitems()).length;
        else return 0;
    }
    else {
        if (ctx.cookies.get("products"))
            return Object.keys(JSON.parse(ctx.cookies.get("products"))).length;

        return 0;
    }
}

// PayPal
async function captureOrder(orderId, debug) {
    try {
        assert(orderId);

        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});

        const response = await paypalClient.execute(request);
        if (debug) {
            console.log("Status Code: " + response.statusCode);
            console.log("Status: " + response.result.status);
            console.log("Order ID: " + response.result.id);
            console.log("Links: ");
            response.result.links.forEach((item, index) => {
                let rel = item.rel;
                let href = item.href;
                let method = item.method;
                let message = `\t${rel}: ${href}\tCall Type: ${method}`;
                console.log(message);
            });
            console.log("Capture Ids:");
            response.result.purchase_units.forEach((item, index) => {
                item.payments.captures.forEach((item, index) => {
                    console.log("\t" + item.id);
                });
            });
            // To toggle print the whole body comment/uncomment the below line
            console.log(JSON.stringify(response.result, null, 4));
        }
        return response;
    }
    catch (e) {
        handleError(e, null, true);

        logger.log('alert',
            `There was an error while trying to capture paypal order #${orderId}!
                ${e.message}`);
    }

    return null;
}

/**
 * 
 * @param {number|string} productid 
 * @param {number|string} qty 
 * @returns 1 if product's qty is bigger, 2 if they are equal, 0 otherwise
 */
async function compareQtyAndProductQty(productid, qty) {
    assert(productid);

    let product = await Product.findOne({ where: { id: productid } });

    if (!product)
        return false;

    comp = 0;

    if (product.quantity > qty) {
        comp = 1;
    }
    else if (product.quantity == qty) {
        comp = 2;
    }
    return comp;
}
async function hasEnoughQtyOfProductsOfOrder(cart) {
    assert(cart);
    let cartOrderItems = await cart.getOrderitems();
    for (i = 0; i < cartOrderItems.length; i++) {
        let cartProduct = await cartOrderItems[i].getProduct();

        if (cartOrderItems[i].quantity > cartProduct.quantity)
            return cartProduct.name;
    }

    return true;
}

async function addProductQtyFromOrder(cart) {
    assert(cart);
    let cartOrderItems = await cart.getOrderitems();
    for (i = 0; i < cartOrderItems.length; i++) {
        let cartProduct = await cartOrderItems[i].getProduct();

        cartProduct.update({ quantity: cartProduct.quantity + cartOrderItems[i].quantity });
    }
}

async function removeProductQtyFromOrder(cart) {
    assert(cart);
    let cartOrderItems = await cart.getOrderitems();
    for (i = 0; i < cartOrderItems.length; i++) {
        let cartProduct = await cartOrderItems[i].getProduct();

        if (cartProduct.quantity < cartOrderItems[i].quantity) {
            const err = new NotEnoughQuantityException(cartProduct.name + " has only " + cartProduct.quantity + " quantity, but order #" + cartOrderItems[i].id + " is trying to order " + cartOrderItems[i].quantity + "!");

            logger.log('alert',
                `Not enough quantity for ${cartProduct.name}!
                ${err.message}`);

            throw err;
        }

        cartProduct.update({ quantity: cartProduct.quantity - cartOrderItems[i].quantity });
    }
}

async function validateStatus(ctx, orderId, responce) {
    assert(ctx);
    assert(responce);
    if (responce.result.status == "COMPLETED") {
        // Order is completed
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

        // Order payed
        let emailtemplate = await Settings.findOne({where: { type: "order" }});

        if (!emailtemplate)
            emailtemplate = DEFAULT_PAYMENT_EMAIL_TEMPLATE;
        
        sendEmail(emailtemplate.sender, user.dataValues.email,
            parseEmailPlaceholders(emailtemplate.subject, user, cart), null,
            parseEmailPlaceholders(emailtemplate.upper, user, cart) +
            (await utilsEcom.getOrderAsTableHTML(cart, emailtemplate)) +
            parseEmailPlaceholders(emailtemplate.lower, user, cart));

        await cart.update({ status: 1, orderedAt: Sequelize.fn('NOW'), price: await cart.getTotal() });

        await removeProductQtyFromOrder(cart);

        ctx.body = { 'msg': 'Your order is completed!', 'status': 'ok' };
    }
    else if (responce.result.status == "VOIDED") {
        // Order is declined
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

        await cart.update({ status: 3, price: await cart.getTotal() });

        ctx.body = { 'msg': 'The payment has been rejected!', 'status': 'error' };
    }
}

async function getReportResponce(filters, limit, offset, time) {
    let text = `SELECT date_trunc('${time}', orders."orderedAt") as "startDate", 
    SUM(orderitems.quantity) as products, 
    COUNT(distinct orders.id) as orders, 
    SUM(distinct price) as total 
    FROM orders 
    INNER JOIN 
    orderitems ON 
    orderitems."orderId" = orders.id 
    WHERE status > 0 AND 
    "orderedAt" BETWEEN '${filters.ordAfter}' 
    AND '${filters.ordBefore}' 
    GROUP BY "startDate" `;

    let countText = `SELECT COUNT(*) FROM (${text}) AS foo;`;

    text += `OFFSET ${offset}`;

    if (limit >= 0) {
        text += ` LIMIT ${limit}`;
    }

    text += ";";

    return [
        db.query(text, {
            type: 'SELECT',
            plain: false,
            model: OrderItem,
            mapToModel: true,
        }),
        db.query(countText, {
            type: 'SELECT',
            plain: false,
        })
    ]
}

function createTempFile(name = 'temp_file', data = '', encoding = 'utf8') {
    return new Promise((resolve, reject) => {
        const tempPath = path.join(os.tmpdir(), 'nodejs-');
        fs.mkdtemp(tempPath, (err, folder) => {
            if (err)
                return reject(err)

            const file_name = path.join(folder, name);

            fs.writeFile(file_name, data, encoding, error_file => {
                if (error_file)
                    return reject(error_file);

                resolve(file_name)
            })
        })
    })
}

async function getProductsAndCountRaw(offset, limit, name, cat, minval, maxval, sort) {
    let text = `SELECT * FROM products 
    LEFT JOIN (SELECT "productId", sum(quantity) FROM orderitems 
    GROUP BY "productId") foo 
    ON "productId" = products.id 
    WHERE ("deletedAt" IS NULL) 
    AND (hide = false) \n`;

    if (name != '' || cat != '' || minval != 0 || maxval != 99999) {
        if (name && name != '') {
            text += ` AND position(upper($1) in upper(name)) > 0 \n`
        }

        if (cat && cat != '') {
            text += ` AND "categoryId" = ${cat}\n`;
        }

        if (minval && minval != 0) {
            text += ` AND "discountPrice" >= ${minval}\n`;
        }

        if (maxval && maxval != 99999) {
            text += ` AND "discountPrice" <= ${maxval}\n`;
        }
    }

    // Count
    let countText = text.replace("*", "count(*)");
    if (countText.indexOf("OFFSET") != -1)
        countText = countText.substring(0, countText.indexOf("OFFSET"));

    if (sort) {
        if (sort == "sales") {
            text += ` ORDER BY (sum IS NULL),sum desc`;
        } else text += ` ORDER BY "createdAt" DESC`;
    } else text += ` ORDER BY "createdAt" DESC`;

    if (offset > 0) {
        text += ` OFFSET ${offset}\n`;
    }

    text += ` LIMIT ${limit}`;

    let returnParams = {
        type: 'SELECT',
        plain: false,
        model: Product,
    }

    if (name && name != '') {
        returnParams.bind = [name];
    }

    return [
        db.query(text, returnParams),
        db.query(countText, returnParams)
    ];
}

function escapeCSVParam(param) {
    assert(param);

    let escapedParam = param.replace(/"/g, `""`);

    return `"${escapedParam}"`;
}

async function saveReportCsv(reportRes, filters, time) {
    assert(reportRes);
    assert(filters);
    assert(time);

    var dataToWrite = escapeCSVParam(`From ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time}`);

    dataToWrite += "\nStart Date, Orders, Products, Total Price, Currency\n";

    for (i = 0; i < reportRes.length; i++) {
        dataToWrite += escapeCSVParam(reportRes[i].dataValues.startDate.toISOString()) + "," +
            escapeCSVParam(reportRes[i].dataValues.orders) + "," + escapeCSVParam(reportRes[i].dataValues.products) + "," +
            escapeCSVParam(reportRes[i].dataValues.total) + "," + "USD" + "\n";
    }

    // Total
    let absTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.total), 0).toFixed(2);
    dataToWrite += ",,," + escapeCSVParam(absTotal) + ",USD";

    return createTempFile('excelReport.csv', dataToWrite);
}

async function saveReportPdf(reportRes, filters, time) {
    assert(reportRes);
    assert(filters);
    assert(time);

    let doc = new PDFDocument({ margin: 30, size: 'A4' });
    let temp = await createTempFile('excelReport.pdf');
    let rows = [];

    for (i = 0; i < reportRes.length; i++) {
        rows.push([reportRes[i].dataValues.startDate.toLocaleDateString('en-GB'),
        reportRes[i].dataValues.orders,
        reportRes[i].dataValues.products,
        reportRes[i].dataValues.total,
            " USD"]);
    }

    // Total
    let absTotal = reportRes.reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a.dataValues.total), 0).toFixed(2);
    rows.push(["", "", "", absTotal, " USD"]);

    let subtitle = `From ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time}`

    doc.pipe(fs.createWriteStream(temp));

    const table = {
        title: "Report Orders",
        subtitle: subtitle,
        headers: [
        {
            label: "Start Date"
        },
        {
            label: "Orders",
            align: "right"
        },
        {
            label: "Products",
            align: "right"
        },
        {
            label: "Total Price",
            align: "right"
        },
        {
            label: " Currency"
        }],
        rows: rows
    };
    doc.table(table, {
        //columnsSize: [ 200, 100, 100 ],
    });

    doc.end();

    return temp;
}

async function saveReportExcel(reportRes, filters, time) {
    assert(reportRes);
    assert(filters);
    assert(time);

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report Orders");
    const path = "./files";  // Path to download excel

    worksheet.getRow(2).values = ['Start Date', 'Orders', 'Products', 'Total Price', 'Currency'];

    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "Start Date", key: "startDate", width: 10 },
        { header: "Orders", key: "orders", width: 10 },
        { header: "Products", key: "products", width: 10 },
        { header: "Total Price", key: "total", width: 10 },
        { header: "Currency", key: "currency", width: 10 },
    ];

    reportRes.forEach(report => {
        let data = [
            report.dataValues.startDate.toLocaleDateString('en-GB'),
            parseInt(report.dataValues.orders),
            parseInt(report.dataValues.products),
            parseFloat(report.dataValues.total),
            "USD"];

        worksheet.addRow(data);
    });

    worksheet.addRow([
        "",
        "",
        "",
        parseFloat(
            reportRes.reduce(
                (partialSum, a) =>
                    parseFloat(partialSum) +
                    parseFloat(a.dataValues.total), 0)
                .toFixed(2)),
        "USD"]);

    /*TITLE*/
    worksheet.mergeCells('A1', 'E1');
    worksheet.getCell('A1').value =
        `From ${new Date(filters.ordAfter).toLocaleString('en-GB')} to ${new Date(filters.ordBefore).toLocaleString('en-GB')} trunced by ${time}`;

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

// Returns every product and how many times its ordered
async function getProductsAndOrderCount(offset, limit, name, cat, minval, maxval) {
    let text = `SELECT products.id, products.name, products.description, products.image,
    products.price, products."discountPrice", products."categoryId",
    products."createdAt", products."deletedAt", count
    FROM products INNER JOIN (SELECT products.name, count(products.name) FROM
    orderitems INNER JOIN products on products.id = orderitems."productId"
    GROUP BY products.name order by count desc)
    as foo on products.name = foo.name
    WHERE products."deletedAt" IS NULL`;

    if (name != '' || cat != '' || minval != 0 || maxval != 99999) {
        if (name && name != '') {
            text += ` AND position(upper($1) in upper(name)) > 0 \n`
        }

        if (cat && cat != '') {
            text += ` AND "categoryId" = ${cat}\n`;
        }

        if (minval && minval != 0) {
            text += ` AND "discountPrice" >= ${minval}\n`;
        }

        if (maxval && maxval != 99999) {
            text += ` AND "discountPrice" <= ${maxval}\n`;
        }
    }

    text += ` ORDER BY count DESC`;

    if (offset > 0) {
        text += ` OFFSET ${offset}\n`;
    }

    text += ` LIMIT ${limit}`;

    if (name && name != '') {
        returnParams.bind = [name];
    }
    return [db.query(text, {
        type: 'SELECT',
        plain: false,
        model: Product
    }),
    db.query(`SELECT count(*) FROM products`, {
        type: 'SELECT',
        plain: false,
        model: Product
    })
    ];
}

function isSessionExpired(staff) {
    assert(staff);

    if (!staff.lastActivity)
        return false;

    return new Date() - new Date(staff.lastActivity) > SESSION_BACK_OFFICE_EXPIRE;
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
    assert(obj1);
    assert(obj2);

    let obj3 = obj1;

    for (key in obj1) {
        let keytwo = obj2[key];

        if (keytwo) {
            if (parseNum)
                obj3[key] = (parseInt(obj3[key]) + parseInt(obj2[key])).toString();
            else obj3[key] += obj2[key];
        }
    }

    for (key in obj2) {
        let keyone = obj3[key];

        if (!keyone) {
            obj3[key] = obj2[key];
        }
    }

    return obj3;
}
// Generate
async function generateOrders(x = 100) {
    const products = await Product.findAll();
    const users = await User.findAll();

    for (o = 0; o < x; o++) {
        const order = await Order.create({
            status: 1,
            orderedAt: new Date(+(new Date()) - Math.floor(Math.random() * 900000000000)),
        });

        for (i = 0; i <= Math.floor(Math.random() * 3) + 1; i++) {
            // Get product
            const product = products[Math.floor(Math.random() * 10000) + 1];

            const orderitem = await OrderItem.create({
                quantity: Math.floor(Math.random() * 3) + 1
            });

            await orderitem.setProduct(product);

            await order.addOrderitem(orderitem);

            const user = users[Math.floor(Math.random() * 10000) + 1];

            order.update({ price: await order.getTotal() });

            user.addOrder(order);
        }
    }
}

async function generateStaff(x = 100) {
    const testUsers = user({
        count: x
    });

    for (o = 0; o < x; o++) {
        Staff.create({
            username: id(),
            email: id() + testUsers[o].email,
            password: id() + id() + id(),
            firstName: testUsers[o].name.first,
            lastName: testUsers[o].name.last
        });
    }
}

async function generateUsers(x = 100) {
    const testUsers = user({
        count: x
    });

    for (o = 0; o < x; o++) {
        let token = generateEmailVerfToken();

        User.create({
            username: id(),
            email: testUsers[o].email + id(),
            password: id(),
            firstName: testUsers[o].name.first,
            lastName: testUsers[o].name.last,
            address: "Bulgaria",
            country: "Bulgaria",
            emailConfirmed: true,
            verificationToken: token
        });
    }
}

async function generateLogs(x = 100) {
    let users = await User.findAll();
    let staffs = await Staff.findAll();
    let orders = await Order.findAll({ where: { status: { [Op.gte]: 1 } } });

    for (o = 0; o < x; o++) {
        let rand = Math.floor(Math.random() * 8);

        let user = users[Math.floor(Math.random() * 10000) + 1];
        let staff = staffs[Math.floor(Math.random() * 10000) + 1];
        let order = orders[Math.floor(Math.random() * 10000) + 1];

        switch (rand) {
            case 0:
                let date1 = new Date(+(new Date()) - Math.floor(Math.random() * 900000000000));
                let date2 = new Date(+(date1) - Math.floor(Math.random() * 10000000000));

                logger.log('info',
                    `Staff ${staff.username} downloaded generated orders report from ${date1.toISOString()} to ${date2.toISOString()} trunced by month in .csv format`,
                    { user: staff.username });
                break;
            case 1:
                logger.log('info',
                    `Staff ${staff.username} tried to see report without rights`,
                    { user: staff.username });
                break;
            case 2:
                logger.log('info',
                    `Staff ${staff.username} updated status of order #${order.id} from ${STATUS_DISPLAY[1]} to ${STATUS_DISPLAY[Math.floor(Math.random() * 5)]}`,
                    { user: staff.username });
                break;
            case 3:
                logger.log('info',
                    `Staff ${staff.username} tried to log in with invalid password!`,
                    { user: staff.username });
                break;
            case 4:
                logger.log('info',
                    `User ${user.username} logged in!`,
                    { user: user.username });
                break;
            case 5:
                logger.log('info',
                    `User ${user.username} logged out!`,
                    { user: user.username });
                break;
            case 6:
                logger.log('alert',
                    `There was an error while trying to capture paypal order #${order.id}!`);
                break;
            case 7:
                logger.log('alert',
                    `Not enough quantity for ${(await order.getOrderitems())[0].name}!`);
        }
    }
} // tb-office-23

// generateUsers(1000);

// generateOrders(80000);

/**
 * 
 * @param {Error} err 
 * @param {import('koa').Context} ctx 
 * @param {boolean} fileOnly 
 */
async function handleError(err, ctx, fileOnly = false) {
    assert(err);
    assert(ctx);

    let username;
    let staffUsername;
    let session;

    if (ctx && ctx.session) {
        username = ctx.session.dataValues.username;
        staffUsername = ctx.session.dataValues.staffUsername;
        session = JSON.stringify(ctx.session.dataValues);
    }

    logger.error(
        `User: ${username}, Staff User: ${staffUsername}, URL: ${ctx.url}, Error message: ${err.message}`,
        {
            longMessage: `Unhandled exception: ${err}, Session: ${session}`,
            fileOnly: fileOnly,
            stacktrace: err.stack
        }
    );

    console.log(err);
}

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
    PRODUCTS_PER_PAGE,
    SESSION_MAX_AGE,
    SESSION_BACK_OFFICE_EXPIRE,
    STATUS_DISPLAY,
    LOG_LEVELS,
    DEFAULT_PAYMENT_EMAIL_TEMPLATE,
    DEFAULT_ORDER_EMAIL_TEMPLATE,
    logger,
    getHost,
    givePages,
    generateEmailVerfToken,
    generateSessionKey,
    configPostgreSessions,
    parseEmailPlaceholders,
    sendEmail,
    getOrderAsTableHTML,
    isSessionExpired,
    isAuthenticatedStaff,
    isAuthenticatedUser,
    hasPermission,
    captureOrder,
    validateStatus,
    getCartQuantity,
    compareQtyAndProductQty,
    hasEnoughQtyOfProductsOfOrder,
    addProductQtyFromOrder,
    removeProductQtyFromOrder,
    getReportResponce,
    getProductsAndCountRaw,
    getProductsAndOrderCount,
    saveReportCsv,
    saveReportExcel,
    saveReportPdf,
    createTempFile,
    combineTwoObjects,
    handleError,
};
