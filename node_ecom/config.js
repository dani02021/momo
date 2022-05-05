const assert = require("assert");

const SESSION_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks;

const DEFAULT_PRODUCTS_PER_PAGE = 12;

const DEFAULT_SESSION_BACK_OFFICE_EXPIRE = 5 * 60 * 1000; // 5 minutes

const DEFAULT_SALT_ROUNDS = 10;

const DEFAULT_CURRENCY = "USD";

const DEFAULT_EMAIL_SENDER = "danielgudjenev@gmail.com";

const DEFAULT_PAYMENT_EMAIL_TEMPLATE = Object.freeze({
    email_payment_sender: 'danielgudjenev@gmail.com',
    email_payment_subject: 'Платена поръчка #$orderid',
    email_payment_upper: '$user, вашата поръчка #$orderid беше платена успешно',
    email_payment_table_h0: 'name',
    email_payment_table_h1: 'price',
    email_payment_table_h2: 'quantity',
    email_payment_table_h3: 'subtotal',
    email_payment_lower: 'Благодаря за вашата поръчка'
});

const DEFAULT_ORDER_EMAIL_TEMPLATE = Object.freeze({
    email_order_sender: 'danielgudjenev@gmail.com',
    email_order_subject: 'Регистрирана поръчка #$orderid',
    email_order_upper: '$user, вашата поръчка #$orderid беше регистрирана успешно',
    email_order_table_h0: 'name',
    email_order_table_h1: 'price',
    email_order_table_h2: 'quantity',
    email_order_table_h3: 'subtotal',
    email_order_lower: 'Благодаря за вашата поръчка'
});

const SETTINGS = {
    // Default settings
    elements_per_page: DEFAULT_PRODUCTS_PER_PAGE,
    backoffice_expire: DEFAULT_SESSION_BACK_OFFICE_EXPIRE,
    currency: DEFAULT_CURRENCY,
    sender_email_parent: DEFAULT_EMAIL_SENDER
};

Object.assign(SETTINGS, DEFAULT_ORDER_EMAIL_TEMPLATE);
Object.assign(SETTINGS, DEFAULT_PAYMENT_EMAIL_TEMPLATE);

const STATUS_DISPLAY = [
    "Not Ordered",
    "Paid",
    "Shipped",
    "Declined",
    "Completed",
    "Ordered",
    "Payer action needed"
];

const LOG_LEVELS = {
    alert: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
    debug: 5
};

const VALID_GENDERS = [
    'Male',
    'Female'
];


/**
 * 
 * @param {object} settings 
 */
async function loadSettings(settings) 
{
    assert(typeof settings === "object");
    
    if (settings instanceof Promise)
        settings = await settings;

    for (i = 0; i < settings.length; i++) 
    {
        SETTINGS[settings[i].key] = settings[i].value;
    }
}

module.exports = {
    SESSION_MAX_AGE,
    DEFAULT_EMAIL_SENDER,
    DEFAULT_ORDER_EMAIL_TEMPLATE,
    DEFAULT_PAYMENT_EMAIL_TEMPLATE,
    DEFAULT_PRODUCTS_PER_PAGE,
    DEFAULT_SESSION_BACK_OFFICE_EXPIRE,
    DEFAULT_SALT_ROUNDS,
    DEFAULT_CURRENCY,
    SETTINGS,
    STATUS_DISPLAY,
    LOG_LEVELS,
    VALID_GENDERS,
    loadSettings
}
