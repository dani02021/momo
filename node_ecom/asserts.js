const { AssertionError } = require("assert");
const assert = require('assert/strict');
const { ClientException } = require("./exceptions");

/**
 * Checks if value is null, NaN or undefined
 * @param {*} value 
 * @param {*} ctx 
 * @param {object} options 
 */
function assert_notNull(value, ctx, options = {}) {
    assert(typeof options === "object");

    let valid = value !== undefined & value !== null & value !== NaN;

    if (!valid) {
        let message = "Value is null";

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
    assert(typeof options === "object");

    assert(options.type !== undefined);

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
    assert_type(value, ctx, {"type": "string", "throwError": options.throwError});
    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

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

    assert_notNull(options.min, ctx, {"throwError": options.throwError});
    assert_notNull(options.max, ctx, {"throwError": options.throwError});

    let valid = value.length >= options.min & value.length <= options.max;

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
    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

    assert_notNull(options.regex, ctx, {"throwError": options.throwError});

    assert_type(options.regex, ctx, {"type": "string", "throwError": options.throwError});

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
    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

    let valid = Number.isSafeInteger(Number(value));

    if (!valid) {
        let message = "Value string is not safe integer";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if value is positive number.
 * Converted by Number constructor.
 * 0 is included
 * @param {*} value 
 * @param {*} ctx 
 * @param {object} options 
 */
function assert_isNonNegativeNumber(value, ctx, options = {}) {
    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

    let valid = Number(value) >= 0;

    if (!valid) {
        let message = "Value is smaller than 0";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if value is integer.
 * Converted by Number constructor.
 * @param {*} value 
 * @param {*} ctx 
 * @param {object} options 
 */
 function assert_isInteger(value, ctx, options = {}) {
    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

    let valid = Number(value) % 1 === 0;

    if (!valid) {
        let message = "Value is not an integer";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if element is included in the array - case insensitive.
 * array is defined in options.array.
 * @param {*} value 
 * @param {*} ctx 
 * @param {object} options 
 */
function assert_isElementInArrayCaseInsensitive(value, ctx, options = {}) {
    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

    let valid = options.array.find(element => {
        return element.toUpperCase() == value.toUpperCase()
    });

    if (!valid) {
        let message = "Element not found in the array";

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if date is after options.max.
 * value and options.max are Date objects
 * Same date is included
 * @param {object} value 
 * @param {*} ctx 
 * @param {object} options 
 */
function assert_isDateAfter(value, ctx, options = {}) {
    assert_type(value, ctx, {"type": "object", "throwError": options.throwError});

    assert(value instanceof Date);

    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

    assert_type(options.max, ctx, {"type": "object", "throwError": options.throwError});

    assert(options.max instanceof Date);

    let valid = (+value) - (+options.max) >= 0;

    if (!valid) {
        let message = `Value date is before specified`;

        return onFalse(value, ctx, options, message);
    }

    return true;
}

/**
 * Checks if date is before options.min.
 * value and options.min are Date objects
 * Same date is included
 * @param {object} value 
 * @param {*} ctx 
 * @param {object} options 
 */
 function assert_isDateBefore(value, ctx, options = {}) {
    assert_type(value, ctx, {"type": "object", "throwError": options.throwError});

    assert(value instanceof Date);

    assert_type(options, ctx, {"type": "object", "throwError": options.throwError});

    assert_type(options.min, ctx, {"type": "object", "throwError": options.throwError});

    assert(options.min instanceof Date);

    let valid = (+value) - (+options.min) >= 0;

    if (!valid) {
        let message = `Value date is after specified`;

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
    assert(typeof options === "object");

    message = options.message || message;

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
    assert_isNonNegativeNumber,
    assert_isInteger,
    assert_isElementInArrayCaseInsensitive,
    assert_isDateBefore,
    assert_isDateAfter
};