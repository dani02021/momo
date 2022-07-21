const assert = require("assert");
const https = require("https");

const SESSION_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks;

const COOKIE_PRODUCTS_EXPIRE = 2147483647e3;

const DEFAULT_SSE_PING = 1000 * 60 * 1 // 1 minute

const DEFAULT_PRODUCTS_PER_PAGE = 12;

const DEFAULT_SESSION_BACK_OFFICE_EXPIRE_MINUTES = 5;

const DEFAULT_MAX_IMAGE_SIZE = 10 * 1000 * 1000; // 10 MB

const DEFAULT_SALT_ROUNDS = 10;

const DEFAULT_CURRENCY = "USD";

const DEFAULT_VAT = 20 / 100; // 20%

const DEFAULT_EMAIL_SENDER = "danielgudjenev@gmail.com";

const DEFAULT_IMPORT_PRODUCT_CHUNK_SIZE = 50;

const DEFAULT_PAYMENT_EMAIL_TEMPLATE = Object.freeze({
    email_payment_sender: 'danielgudjenev@gmail.com',
    email_payment_subject: 'Платена поръчка #$orderid',
    email_payment_upper: '$user, вашата поръчка #$orderid беше платена успешно',
    email_payment_table_h0: 'name',
    email_payment_table_h1: 'price',
    email_payment_table_h2: 'quantity',
    email_payment_table_h3: 'subtotal',
	email_payment_table_h4: 'vat',
	email_payment_table_h5: 'grandtotal',
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
	email_order_table_h4: 'vat',
	email_order_table_h5: 'grandtotal',
    email_order_lower: 'Благодаря за вашата поръчка'
});

const SETTINGS = {
    // Default settings
    elements_per_page: DEFAULT_PRODUCTS_PER_PAGE,
    backoffice_expire: DEFAULT_SESSION_BACK_OFFICE_EXPIRE_MINUTES,
    currency: DEFAULT_CURRENCY,
    vat: DEFAULT_VAT,
    sender_email_parent: DEFAULT_EMAIL_SENDER,
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

let COUNTRY_LIST = [
	"Afghanistan",
	"Albania",
	"Algeria",
	"American Samoa",
	"Andorra",
	"Angola",
	"Anguilla",
	"Antarctica",
	"Antigua and Barbuda",
	"Argentina",
	"Armenia",
	"Aruba",
	"Australia",
	"Austria",
	"Azerbaijan",
	"Bahamas (the)",
	"Bahrain",
	"Bangladesh",
	"Barbados",
	"Belarus",
	"Belgium",
	"Belize",
	"Benin",
	"Bermuda",
	"Bhutan",
	"Bolivia (Plurinational State of)",
	"Bonaire, Sint Eustatius and Saba",
	"Bosnia and Herzegovina",
	"Botswana",
	"Bouvet Island",
	"Brazil",
	"British Indian Ocean Territory (the)",
	"Brunei Darussalam",
	"Bulgaria",
	"Burkina Faso",
	"Burundi",
	"Cabo Verde",
	"Cambodia",
	"Cameroon",
	"Canada",
	"Cayman Islands (the)",
	"Central African Republic (the)",
	"Chad",
	"Chile",
	"China",
	"Christmas Island",
	"Cocos (Keeling) Islands (the)",
	"Colombia",
	"Comoros (the)",
	"Congo (the Democratic Republic of the)",
	"Congo (the)",
	"Cook Islands (the)",
	"Costa Rica",
	"Croatia",
	"Cuba",
	"Curaçao",
	"Cyprus",
	"Czechia",
	"Côte d'Ivoire",
	"Denmark",
	"Djibouti",
	"Dominica",
	"Dominican Republic (the)",
	"Ecuador",
	"Egypt",
	"El Salvador",
	"Equatorial Guinea",
	"Eritrea",
	"Estonia",
	"Eswatini",
	"Ethiopia",
	"Falkland Islands (the) [Malvinas]",
	"Faroe Islands (the)",
	"Fiji",
	"Finland",
	"France",
	"French Guiana",
	"French Polynesia",
	"French Southern Territories (the)",
	"Gabon",
	"Gambia (the)",
	"Georgia",
	"Germany",
	"Ghana",
	"Gibraltar",
	"Greece",
	"Greenland",
	"Grenada",
	"Guadeloupe",
	"Guam",
	"Guatemala",
	"Guernsey",
	"Guinea",
	"Guinea-Bissau",
	"Guyana",
	"Haiti",
	"Heard Island and McDonald Islands",
	"Holy See (the)",
	"Honduras",
	"Hong Kong",
	"Hungary",
	"Iceland",
	"India",
	"Indonesia",
	"Iran (Islamic Republic of)",
	"Iraq",
	"Ireland",
	"Isle of Man",
	"Israel",
	"Italy",
	"Jamaica",
	"Japan",
	"Jersey",
	"Jordan",
	"Kazakhstan",
	"Kenya",
	"Kiribati",
	"Korea (the Democratic People's Republic of)",
	"Korea (the Republic of)",
	"Kuwait",
	"Kyrgyzstan",
	"Lao People's Democratic Republic (the)",
	"Latvia",
	"Lebanon",
	"Lesotho",
	"Liberia",
	"Libya",
	"Liechtenstein",
	"Lithuania",
	"Luxembourg",
	"Macao",
	"Madagascar",
	"Malawi",
	"Malaysia",
	"Maldives",
	"Mali",
	"Malta",
	"Marshall Islands (the)",
	"Martinique",
	"Mauritania",
	"Mauritius",
	"Mayotte",
	"Mexico",
	"Micronesia (Federated States of)",
	"Moldova (the Republic of)",
	"Monaco",
	"Mongolia",
	"Montenegro",
	"Montserrat",
	"Morocco",
	"Mozambique",
	"Myanmar",
	"Namibia",
	"Nauru",
	"Nepal",
	"Netherlands (the)",
	"New Caledonia",
	"New Zealand",
	"Nicaragua",
	"Niger (the)",
	"Nigeria",
	"Niue",
	"Norfolk Island",
	"Northern Mariana Islands (the)",
	"Norway",
	"Oman",
	"Pakistan",
	"Palau",
	"Palestine, State of",
	"Panama",
	"Papua New Guinea",
	"Paraguay",
	"Peru",
	"Philippines (the)",
	"Pitcairn",
	"Poland",
	"Portugal",
	"Puerto Rico",
	"Qatar",
	"Republic of North Macedonia",
	"Romania",
	"Russian Federation (the)",
	"Rwanda",
	"Réunion",
	"Saint Barthélemy",
	"Saint Helena, Ascension and Tristan da Cunha",
	"Saint Kitts and Nevis",
	"Saint Lucia",
	"Saint Martin (French part)",
	"Saint Pierre and Miquelon",
	"Saint Vincent and the Grenadines",
	"Samoa",
	"San Marino",
	"Sao Tome and Principe",
	"Saudi Arabia",
	"Senegal",
	"Serbia",
	"Seychelles",
	"Sierra Leone",
	"Singapore",
	"Sint Maarten (Dutch part)",
	"Slovakia",
	"Slovenia",
	"Solomon Islands",
	"Somalia",
	"South Africa",
	"South Georgia and the South Sandwich Islands",
	"South Sudan",
	"Spain",
	"Sri Lanka",
	"Sudan (the)",
	"Suriname",
	"Svalbard and Jan Mayen",
	"Sweden",
	"Switzerland",
	"Syrian Arab Republic",
	"Taiwan",
	"Tajikistan",
	"Tanzania, United Republic of",
	"Thailand",
	"Timor-Leste",
	"Togo",
	"Tokelau",
	"Tonga",
	"Trinidad and Tobago",
	"Tunisia",
	"Turkey",
	"Turkmenistan",
	"Turks and Caicos Islands (the)",
	"Tuvalu",
	"Uganda",
	"Ukraine",
	"United Arab Emirates (the)",
	"United Kingdom of Great Britain and Northern Ireland (the)",
	"United States Minor Outlying Islands (the)",
	"United States of America (the)",
	"Uruguay",
	"Uzbekistan",
	"Vanuatu",
	"Venezuela (Bolivarian Republic of)",
	"Viet Nam",
	"Virgin Islands (British)",
	"Virgin Islands (U.S.)",
	"Wallis and Futuna",
	"Western Sahara",
	"Yemen",
	"Zambia",
	"Zimbabwe",
	"Åland Islands"
];

let VALID_GENDERS = [
    'Male',
    'Female'
];

let PRODUCT_IMPORT_TABLE_HEADERS = [
    'Type', 'SKU', 'Name',
    'Short description', 'Description',
    'Quantity', 'Тегло (kg)',
    'Regular price', 'Categories',
    'Images'
];

let PROMOTION_STATUSES = [
    'pending', 'active', 'expired'
];

const ERROR_TYPES = {
	// Back-end
	NO_PERMISSION: 101,
	SEQUELIZE_VALIDATION: 102,

	// Front-end
	VOUCHERS_TOO_MUCH_COUNT: 201,
	VOUCHERS_TOO_MUCH_VALUE: 202,
	ORDER_PAYMENT_PRICE_DIFF: 210,

	UNDEFINED: 100
}

/**
 *
 * @param {object} settings
 */
async function loadSettings(settings)
{
    assert(settings !== null);
    assert(typeof settings === "object");

    // if (settings instanceof Promise) NOT GOOD PRACTICE
    //    settings = await settings;

    if (typeof settings.then === "function")
        settings = await settings;

    for (i = 0; i < settings.length; i++)
    {
        SETTINGS[settings[i].key] = settings[i].value;
    }

    https.get({
        host: 'restcountries.com',
        path: '/v3.1/all',
        headers: {'User-Agent': 'request'}
        },
        function (res) {
            var json = '';
            res.on('data', function (chunk) {
                json += chunk;
            });
            res.on('end', function () {
                if (res.statusCode === 200) {
                    try {
                        var data = JSON.parse(json);

                        // data is available here:
                        COUNTRY_LIST = [];

                        for (i = 0; i < data.length; i++)
                            COUNTRY_LIST.push(data[i].name.common);
                    } catch (e) { }
                } else { }
            });
        }).on('error', function (err) { console.log(err) });
}

module.exports = {
    SESSION_MAX_AGE,
    COOKIE_PRODUCTS_EXPIRE,
    DEFAULT_SSE_PING,
    DEFAULT_PRODUCTS_PER_PAGE,
    DEFAULT_MAX_IMAGE_SIZE,
    DEFAULT_SALT_ROUNDS,
    DEFAULT_CURRENCY,
    DEFAULT_VAT,
    DEFAULT_EMAIL_SENDER,
    DEFAULT_ORDER_EMAIL_TEMPLATE,
    DEFAULT_PAYMENT_EMAIL_TEMPLATE,
    DEFAULT_SESSION_BACK_OFFICE_EXPIRE_MINUTES,
    SETTINGS,
    STATUS_DISPLAY,
    LOG_LEVELS,
    VALID_GENDERS,
    COUNTRY_LIST,
    PRODUCT_IMPORT_TABLE_HEADERS,
    PROMOTION_STATUSES,
	  ERROR_TYPES,
    loadSettings
}
