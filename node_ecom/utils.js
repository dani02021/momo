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
const Session = models.session();
const Staff = models.staff();
const Role = models.role();
const User = models.user();
const Order = models.order();
const OrderItem = models.orderitem();
const Product = models.product();
const Log = models.log();

const fs = require('fs');
const os = require('os');
const path = require('path');

const { id, user } = require('rangen');

const db = require("./db.js");

const excelJS = require("exceljs");

const PRODUCTS_PER_PAGE = 12;
const SESSION_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks
const STATUS_DISPLAY = [
    "Not Ordered",
    "Pending",
    "Shipped",
    "Declined",
    "Completed",
    "Not payed",
    "Payer action needed"
    ]

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
      console.log(error);
      logger.log('alert',
        `Email transport cannot be verified!
        ${err.message}`);
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
      setImmediate(() => {
        this.emit('logged', info);
      });

      let user = "";
      
      if (info.user)
        user = info.user;
    
      Log.create({ timestamp: new Date().toISOString(), user: user, level: info.level, message: info.message });
  
      // Perform the writing to the remote service
      callback();
    }
};

const logger = winston.createLogger({
    levels: {
        alert: 0,
        error: 1,
        warn: 2,
        info: 3,
        verbose: 4,
        debug: 5
    },
    transports: [
      new SequelizeTransport({
          level: "debug"
      })
    ]
});

function givePages(page, lastPage) {
    var delta = 1,
        left = page - delta,
        right = page + delta + 1,
        range = [],
        rangeWithDots = [],
        l;

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
async function sendEmail(email, token) {
    var message = {
        from: "danielgudjenev@gmail.com",
        to: email,
        subject: "Email Verification NodeJS",
        text: `Here is your link: http://localhost:3000/verify_account/${token}`,
    };

    EmailTransport.sendMail(message);
}

function configPostgreSessions() {
    return {
      // Get session object by key. 
      get: async (key, maxAge, { rolling }) => 
      {
        let session;
        await Session.findOne({where: {key: key}}).then(sessionv => { session = sessionv; })
        return session;
      },
  
      // Set session object for key, with a maxAge (in ms).
      set: async (key, session, maxAge, { rolling, changed }) => 
      {
        await Session.upsert({key: key, expire: session._expire, maxAge: maxAge,
            messages: session.messages, username: session.username, isStaff: session.isStaff});
      },
  
      // Destroy session for key.
      destroy: async key => 
        await Session.findOne({where: {key: key}}).then(session => session.destroy()),
    }
  }

async function isAuthenticatedUser(ctx) 
{
    if (ctx.session.dataValues.username && !ctx.session.dataValues.isStaff) {
        const user = await User.findOne({ where: { username: ctx.session.dataValues.username }});

        if (user == null) 
        {
            return false;
        } 
        else 
        {
            return true;
        }
    }

    return false;
}
async function isAuthenticatedStaff(ctx) 
{
    if (ctx.session.dataValues && ctx.session.dataValues.isStaff) 
    {
        if (ctx.session.dataValues.username) {
            const staff = await Staff.findOne({ where: { username: ctx.session.dataValues.username }});
    
            if (staff == null) 
            {
                return false;
            } 
            else 
            {
                return true;
            }
        }
    }

    return false;
}

async function hasPermission(ctx, permission) 
{
    const staff = await Staff.findOne({ where: { username: ctx.session.dataValues.username }, include: Role });

    if (staff == null) {
        return false;
    } else {
        /*
            This code reads from db only once, looping thru it doesn't
            send new requests to the db!
        */
        const roles = await staff.getRoles();

        for(let role in roles) 
        {
            const permissions = await roles[role].getPermissions();
            
            for(let perm in permissions) 
            {
                if (permissions[perm].name == permission) 
                {
                    return true;
                }
            }
        }

        return false;
    }
}

// PayPal
async function captureOrder(orderId, debug=false) {
    try {
        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});

        const response = await paypalClient.execute(request);
        if (debug) 
        {
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
            response.result.purchase_units.forEach((item,index)=>{
            	item.payments.captures.forEach((item, index)=>{
            		console.log("\t"+item.id);
                });
            });
            // To toggle print the whole body comment/uncomment the below line
            console.log(JSON.stringify(response.result, null, 4));
        }
        return response;
    }
    catch (e) {
        console.log(e);

        logger.log('alert',
                `There was an error while trying to capture order #${orderId}!
                ${e.message}`);
    }

    return null;
}

async function addProductQtyFromOrder(cart) 
{
    let cartOrderItems = await cart.getOrderitems();
    for(i = 0; i < cartOrderItems.length; i++ ) 
    {
        let cartProduct = await cartOrderItems[i].getProduct();

        cartProduct.update({quantity: cartProduct.quantity + cartOrderItems[i].quantity});
    }
}

async function removeProductQtyFromOrder(cart) 
{
    let cartOrderItems = await cart.getOrderitems();
    for(i = 0; i < cartOrderItems.length; i++ ) 
    {
        let cartProduct = await cartOrderItems[i].getProduct();

        if (cartProduct.quantity < cartOrderItems[i].quantity) 
        {
            const err = new NotEnoughQuantityException(cartProduct.name + " has only " + cartProduct.quantity + " quantity, but order #" + cartOrderItems[i].id + " is trying to order " + cartOrderItems[i].quantity + "!");
            
            logger.log('alert',
                `Not enough quantity for ${cartProduct.name}!
                ${err.message}`);
            
            throw err;
        }

        cartProduct.update({quantity: cartProduct.quantity - cartOrderItems[i].quantity});
    }
}

async function validateStatus(ctx, orderId, responce) 
{
    if (responce.result.status == "COMPLETED") 
    {
        // Order is completed
        const user = await User.findOne({where: {
            username: ctx.session.dataValues.username
        }});

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
        
        if(!cart) {
            ctx.redirect('/');
            return;
        }
        
        await cart.update({status: 1, orderedAt: Sequelize.fn('NOW'), price: await cart.getTotal()});

        await removeProductQtyFromOrder(cart);

        ctx.body = {'msg': 'Your order is completed!', 'status': 'ok'};
    }
    else if(responce.result.status == "VOIDED") 
    {
        // Order is declined
        const user = await User.findOne({where: {
            username: ctx.session.dataValues.username
        }});

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
        
        await cart.update({status: 3, price: await cart.getTotal()});

        ctx.body = {'msg': 'The payment has been rejected!', 'status': 'error'};
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

    if (limit >= 0) 
    {
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

function createTempFile (name = 'temp_file', data = '', encoding = 'utf8') {
    return new Promise((resolve, reject) => {
        const tempPath = path.join(os.tmpdir(), 'foobar-');
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

async function getProductsAndCountRaw(offset, limit, name, cat, minval, maxval) {
    let text = `SELECT * FROM products 
    WHERE ("deletedAt" IS NULL) 
    AND (hide = false) \n`;
    
    if (name != '' || cat != '' || minval != 0 || maxval != 99999) 
    {
        if (name && name != '') 
        {
            text += ` AND position(upper($1) in upper(name)) > 0 \n`
        }

        if (cat && cat != '') 
        {
            text += ` AND "categoryId" = ${cat}\n`;
        }

        if (minval && minval != 0) 
        {
            text += ` AND "discountPrice" >= ${minval}\n`;
        }

        if (maxval && maxval != 99999) 
        {
            text += ` AND "discountPrice" <= ${maxval}\n`;
        }
    }
    
    // Count
    let countText = text.replace("*", "count(*)");
    if (countText.indexOf("OFFSET") != -1)
        countText = countText.substring(0, countText.indexOf("OFFSET"));
    
    text += ` ORDER BY "createdAt"`;

    if (offset > 0) 
    {
        text += ` OFFSET ${offset}\n`;
    }

    text += ` LIMIT ${limit}`;
    
    let returnParams = {
        type: 'SELECT',
        plain: false,
        model: Product,
    }

    if (name && name != '') 
    {
        returnParams.bind = [name];
    }
    
    return [
        db.query(text, returnParams),
        db.query(countText, returnParams)
    ];
}

async function saveReportCsv(reportRes) {
    var dataToWrite = "startDate, orders, products, total\n";

    for(i = 0; i < reportRes.length; i++) 
    {
        dataToWrite += reportRes[i].dataValues.startDate.toISOString() + ", " + 
            reportRes[i].dataValues.orders + ", " +  reportRes[i].dataValues.products + ", " +
            reportRes[i].dataValues.total + "\n";
    }

    return createTempFile('excelReport.csv', dataToWrite);
}

async function saveReportExcel(reportRes) 
{
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report Orders");
    const path = "./files";  // Path to download excel

    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "Start Date", key: "startDate", width: 10 }, 
        { header: "Orders", key: "orders", width: 10 },
        { header: "Products", key: "products", width: 10 },
        { header: "Total", key: "total", width: 10 },
    ];

    reportRes.forEach(report => {
        let data = [
            report.dataValues.startDate,
            parseInt(report.dataValues.orders),
            parseInt(report.dataValues.products),
            parseFloat(report.dataValues.total)];
        
        worksheet.addRow(data);
    });

    // Make first row bold
    worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
    });

    // await workbook.xlsx.writeFile(`${path}/users.xlsx`);

    const buffer = await workbook.xlsx.writeBuffer();

    return createTempFile('excel_report.xlsx', buffer);
}

// Generate
async function generateOrders(x = 100) 
{
    const products = await Product.findAll();
    const users = await User.findAll();

    for (o = 0; o < x; o++) 
    {
        const order = await Order.create({
            status: 1,
            orderedAt: new Date(+(new Date()) - Math.floor(Math.random()*900000000000)),
        });

        for (i = 0; i <= Math.floor(Math.random() * 3) + 1; i++) 
        {
            // Get product
            const product = products[Math.floor(Math.random() * 10_000) + 1];

            const orderitem = await OrderItem.create({
                quantity: Math.floor(Math.random() * 3) + 1
            });

            await orderitem.setProduct(product);

            await order.addOrderitem(orderitem);

            const user = users[Math.floor(Math.random() * 10_000) + 1];

            order.update({price: await order.getTotal()});

            user.addOrder(order);
        }
    }
}

async function generateUsers(x = 100) {
    const testUsers = user({
        count: x
    });

    for (o = 0; o < x; o++) 
    {
        let token = generateEmailVerfToken();

        User.create({
            username: id(),
            email: testUsers[o].email+id(),
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
    let orders = await Order.findAll();

    for (o = 0; o < x; o++) 
    {
        let rand = Math.floor(Math.random() * 8);

        let user = users[Math.floor(Math.random() * 10_000) + 1];
        let order = orders[Math.floor(Math.random() * 10_000) + 1];

        switch (rand) 
        {
            case 0:
                let date1 = new Date(+(new Date()) - Math.floor(Math.random()*900000000000));
                let date2 = new Date(+(date1) - Math.floor(Math.random()*10000000000));

                logger.log('info',
                    `Staff ${user.username} downloaded generated orders report from ${date1.toISOString()} to ${date2.toISOString()} trunced by month in .csv format`,
                    {user: user.username});
                break;
            case 1:
                logger.log('info',
                    `Staff ${user.username} tried to see report without rights`,
                    {user: user.username});
                break;
            case 2:
                logger.log('info',
                    `Staff ${user.username} updated status of order #${order.id} from ${STATUS_DISPLAY[1]} to ${STATUS_DISPLAY[Math.floor(Math.random() * 5)]}`,
                    {user: user.username});
                break;
            case 3:
                logger.log('info',
                    `Staff ${user.username} tried to log in with invalid password!`,
                    {user: user.username});
                break;
            case 4:
                logger.log('info',
                    `User ${user.username} logged in!`,
                    {user: user.username});
                break;
            case 5:
                logger.log('info',
                    `User ${user.username} logged out!`,
                    {user: user.username});
                break;
            case 6:
                logger.log('alert',
                    `There was an error while trying to capture order #${order.id}!`);
                break;
            case 7:
                logger.log('alert',
                    `Not enough quantity for ${order.getOrderitems()[0].name}!`);
        }
    }
}

// generateUsers(1000);

// generateOrders(80000);

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
    STATUS_DISPLAY,
    logger,
    givePages,
    generateEmailVerfToken,
    generateSessionKey,
    configPostgreSessions,
    sendEmail,
    isAuthenticatedStaff,
    isAuthenticatedUser,
    hasPermission,
    captureOrder,
    validateStatus,
    addProductQtyFromOrder,
    removeProductQtyFromOrder,
    getReportResponce,
    getProductsAndCountRaw,
    saveReportCsv,
    saveReportExcel,
    createTempFile,
};
