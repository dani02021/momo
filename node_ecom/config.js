const SESSION_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks;

var PRODUCTS_PER_PAGE = 12;
var SESSION_BACK_OFFICE_EXPIRE = 5 * 60 * 1000; // 5 minutes

module.exports = {
    SESSION_MAX_AGE,
    PRODUCTS_PER_PAGE,
    SESSION_BACK_OFFICE_EXPIRE
} 