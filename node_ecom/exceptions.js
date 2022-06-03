class NotEnoughQuantityException extends Error {
    constructor(message) {
        super(message);
        this.name = "NotEnoughQuantityException";
        this.code = "NOT_ENOUGH_QUANTITY";
    }
}

class ClientException extends Error {
    constructor(message, options) {
        super(message);
        this.name = "ClientException";
        this.code = "CLIENT_EXCEPTION";
        this.options = options;
    }
}

module.exports = {
    NotEnoughQuantityException, ClientException
}