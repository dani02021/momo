const assert = require("assert/strict");
const stacktrace = require("stack-trace");
const winston = require('winston');
const WinstonTransport = require('winston-transport');
const models = require("./models.js");
const configEcom = require("./config.js");
const { ClientException } = require("./exceptions.js");
const { ValidationErrorItem } = require("sequelize");

const Log = models.log();

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
    levels: configEcom.LOG_LEVELS,
    transports: [
        new SequelizeTransport({
            level: "debug"
        }),
        new winston.transports.File({
            level: "error",
            // Create the log directory if it does not exist
            filename: 'logs/error.log',
            format: winston.format.printf(log => `[${new Date().toLocaleString("en-GB")}] ` + log.message.replaceAll('\n', '')),
        }),
        new winston.transports.File({
            level: "error",
            // Create the log directory if it does not exist
            filename: 'logs/fullerror.log',
            format: winston.format.printf(log => `[${new Date().toLocaleString("en-GB")}] ` + log.stacktrace),
        })
    ]
});

/**
 * Global error handler
 *
 * @param {Error} err
 * @param {import('koa').Context} ctx
 * @param {boolean} fileOnly
 */
async function handleError(err, options) {
    assert(err instanceof Error);
    assert(typeof options === "object");

    if ((err.errors && err.errors[0] instanceof ValidationErrorItem)
         || err instanceof ClientException) {
            // Don't log the error

            return;
    }

    let username;
    let staffUsername;
    let session;

    if (options.ctx && options.ctx.session && options.ctx.session.dataValues) {
        username = options.ctx.session.dataValues.username;
        staffUsername = options.ctx.session.dataValues.staffUsername;
        session = JSON.stringify(options.ctx.session.dataValues);
    }

    let stackerr = stacktrace.parse(err);

    if (stackerr.length == 0) {
        logger.error(
            `User: ${username}, \
            Staff User: ${staffUsername}, \
            URL: ${options.ctx ? options.ctx.url : "undefined"}, \
            Error message: ${err.message}`,
            {
                longMessage: `Unhandled exception: ${err}, Session: ${session}`,
                fileOnly: options.fileOnly,
                stacktrace: err.stack
            }
        );
    } else {
        logger.error(
            `File: ${stackerr[0].fileName} on function ${stackerr[0].functionName} \
            on line ${stackerr[0].lineNumber} \
            User: ${username}, \
            Staff User: ${staffUsername}, \
            URL: ${options.ctx ? options.ctx.url : "undefined"}, \
            Error message: ${err.message}`,
            {
                longMessage: `Unhandled exception: ${err}, Session: ${session}`,
                fileOnly: options.fileOnly,
                stacktrace: err.stack
            }
        );
    }

    console.log("ERRRRR");

    console.err(err);
}

module.exports = {
    logger,
    handleError
};
