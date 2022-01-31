const crypto = require('crypto');
const nodemailer = require("nodemailer");
require('dotenv').config();

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
    } else {
      console.log("Server is ready to take our messages");
    }
  });

const PRODUCTS_PER_PAGE = 12;

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
        text: `Here is your link: http://localhost:3000/verify_account?${token}`,
    };

    transport.sendMail(message);
}

// Constants
module.exports.PRODUCTS_PER_PAGE = PRODUCTS_PER_PAGE;


module.exports.givePages = givePages;
module.exports.generateEmailVerfToken = generateEmailVerfToken;
module.exports.sendEmail = sendEmail;
