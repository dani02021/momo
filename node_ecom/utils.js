require('dotenv').config();

const crypto = require('crypto');
const nodemailer = require("nodemailer");
const paypal = require('@paypal/checkout-server-sdk');
let environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
let paypalClient = new paypal.core.PayPalHttpClient(environment);

const models = require("./models.js");
const { Sequelize } = require('./db.js');
const Session = models.session();
const Staff = models.staff();
const Role = models.role();
const User = models.user();
const Order = models.order();

const fs = require('fs');

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
const NotEnoughQuantityException = (message)=>({
    error: new Error(message),
    code: 'NOT_ENOUGH_QUANTITY'
});

const transport = nodemailer.createTransport({
    pool: true,
    service: 'gmail',
    secure: true, // use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: Buffer.from(process.env.EMAIL_PASS, "base64").toString('ascii'),
    },
});

transport.verify(function (error, success) {
    if (error) {
      console.log(error);
    }
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

    transport.sendMail(message);
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
    if (ctx.session.dataValues.username) {
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
    if (ctx.session.dataValues.isStaff) 
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
        console.log(e)
    }
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
            throw NotEnoughQuantityException(cartProduct.name + " has only " + cartProduct.quantity + " quantity, but order #" + cartOrderItems[i].id + " is trying to order " + cartOrderItems[i].quantity + "!");
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

async function getReportResponce(filters, limit, offset) {
    return db.query(`select date_trunc('${time}', orderitems."createdAt") as "startDate", 
  sum(orderitems.quantity) as products, 
  count(distinct orders.id) as orders, 
  sum(distinct price) as total 
  from orderitems 
  inner join 
  orders on 
  orderitems."orderId" = orders.id 
  where status > 0 and 
  "orderedAt" between '${filters.ordAfter.toISOString()}' 
  and '${filters.ordBefore.toISOString()}' 
  group by "startDate" 
  limit ${limit} 
  offset ${offset};`, { 
    type: 'SELECT',
    plain: false,
    model: OrderItem,
    mapToModel: true,
   });
}

function saveReport(reportRes) {
    var dataToWrite;

    dataToWrite += "startDate, products, orders, total\n";

    for(i = 0; i < reportRes.length; i++) 
    {
        dataToWrite += reportRes[i].dataValues.startDate + ", " + 
            reportRes[i].dataValues.orders + ", " +  reportRes[i].dataValues.products + ", " +
            reportRes[i].dataValues.total;
    }

    fs.writeFile('form-tracking/formList.csv', dataToWrite, 'utf8', function (err) {
        if (err) {
            console.log('Some error occured - file either not saved or corrupted file saved.');
        } else {
            console.log('It\'s saved!');
        }
    });
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
    STATUS_DISPLAY,
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
    saveReport,
};
