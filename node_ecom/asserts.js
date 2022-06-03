const { AssertionError } = require("assert");
const { assert } = require("assert/strict");
const { ClientException } = require("./exceptions");

/**
 * Checks if value is null, NaN or undefined
 * @param {*} value 
 * @param {*} ctx 
 * @param {object} options 
 */
function assert_notNull(value, ctx, options = {}) {
    assert(typeof options === "object");

    let valid = value === undefined || value === null || value === NaN;

    if (!valid) {
        let message = "Value has invalid value";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if the type of value is equal to that of
 * options.type.
 * @param {string} value 
 * @param {*} ctx 
 * @param {object} options 
 */
 function assert_type(value, ctx, options = {}) {
    assert(typeof value === "object");

    assert_notNull(options.type, ctx, {"throwError": "assert"});

    assert(typeof options.type === "string");

    let valid = typeof value === options.type;

    if (!valid) {
        let message = "Value is of wrong type";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Check if value is in format YYYY-MM-DD,
 * throw error if value is not in the format
 * @param {string} value 
 * @param {*} ctx 
 * @param {object} options
 */
function assert_isValidISODate(value, ctx, options = {}) {
    assert_type(value, ctx, {"type": "string", "throwError": "assert"});
    assert_type(options, ctx, {"type": "object", "throwError": "assert"});

    let valid = /^\d{4}-\d{2}-\d{2}$/.test(value);

    if (!valid) {
        let message = "Date string is not in valid YYYY-MM-DD format";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if string lenght is in range including both ends
 * Specified by options.min and options.max values
 * @param {string} value 
 * @param {*} ctx 
 * @param {object} options 
 */
function assert_stringLength(value, ctx, options = {}) {
    assert_type(value, ctx, {"type": "string"});
    assert_type(options, ctx, {"type": "object"});

    assert_notNull(options.min, ctx, {"throwError": "assert"});
    assert_notNull(options.max, ctx, {"throwError": "assert"});

    let valid = value.length >= options.min && value.length <= options.min;

    if (!valid) {
        let message = "String value is not within range";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if regex is found in value.
 * options.regex is of type string.
 * options.parameters are parameters of the regex.
 * @param {string} value 
 * @param {*} ctx 
 * @param {object} options 
 */
function assert_regex(value, ctx, options = {}) {
    assert_type(value, ctx, {"type": "string", "throwError": "assert"});
    assert_type(options, ctx, {"type": "object", "throwError": "assert"});

    assert_notNull(options.regex, ctx, {"throwError": "assert"});

    assert_type(options.regex, ctx, {"type": "string", "throwError": "assert"});

    let valid = new RegExp(options.regex, options.parameters).test(value);

    if (!valid) {
        let message = "Regex not found in the value string";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if value is safe integer
 * @param {string} value
 * @param {*} ctx
 * @param {object} options
 */
function assert_isSafeInteger(value, ctx, options) {
    assert_type(options, ctx, {"type": "object", "throwError": "assert"});

    let valid = Number.isSafeInteger(Number(value));

    if (!valid) {
        let message = "Value string is not safe integer";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if value is positive integer.
 * Converted by Number constructor.
 * 0 is included
 * @param {*} value 
 * @param {*} ctx 
 * @param {*} options 
 */
function assert_isNonNegativeNumber(value, ctx, options) {
    // TODO
    assert_type(options, ctx, {"type": "object", "throwError": "assert"});

    let valid = Number(value) >= 0;

    if (!valid) {
        let message = "Value is smaller than 0";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

// Utility class

/**
 * Utility class used by asserts.js
 * @param {*} value 
 * @param {*} ctx 
 * @param {object} options 
 * @param {string} message 
 */
function onFalse(value, ctx, options = {}, message) {
    assert_type(value, ctx, {"type": "object"});
    assert_type(value, ctx, {"type": "string"});

    message = message || options.message;

    if (options.throwError) {
        switch (options.throwError) {
            case "client":
                throw new ClientException(options.message, { ctx: ctx });
            case "assert":
                throw new AssertionError({ message: message });
            default: throw new Error(options.message);
        }
    }

    return false;
}

module.exports = {
    assert_notNull,
    assert_isValidISODate,
    assert_stringLength,
    assert_type,
    assert_regex,
    assert_isSafeInteger,
    assert_isNonNegativeInteger
};