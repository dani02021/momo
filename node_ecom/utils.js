const crypto = require('crypto');
const nodemailer = require("nodemailer");
require('dotenv').config();

const models = require("./models.js");
const Session = models.session();
const Staff = models.staff();
const Role = models.role();
const User = models.user();

const PRODUCTS_PER_PAGE = 12;
const SESSION_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks

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

module.exports = {
    PRODUCTS_PER_PAGE,
    SESSION_MAX_AGE,
    givePages,
    generateEmailVerfToken,
    generateSessionKey,
    configPostgreSessions,
    sendEmail,
    isAuthenticatedStaff,
    isAuthenticatedUser,
    hasPermission,
};
