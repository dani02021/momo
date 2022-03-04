# PayPal SDK 2.0.0-beta [![Build Status](https://travis-ci.org/paypal/PayPal-node-SDK.svg?branch=2.0-beta)](https://travis-ci.org/paypal/PayPal-node-SDK)

This is a preview of how PayPal SDKs will look in the next major version. We've simplified the interface to only provide HTTPRequest that can easily be called via our HttpClient.

### Creating a Payment

```node
const paypal = require('paypal-rest-sdk');
const payments = paypal.v1.payments;

let env = new paypal.core.SandboxEnvironment('AdV4d6nLHabWLyemrw4BKdO9LjcnioNIOgoz7vD611ObbDUL0kJQfzrdhXEBwnH8QmV-7XZjvjRWn0kg', 'EPKoPC_haZMTq5uM9WXuzoxUVdgzVqHyD5avCyVC1NCIUJeVaNNUZMnzduYIqrdw-carG9LBAizFGMyK');
let client = new paypal.core.PayPalHttpClient(env);

let payment = {
  "intent": "sale",
  "transactions": [
    "amount": {
      "currency": "USD",
      "amount": "10"
    }
  ],
  "redirect_urls": {
    "cancel_url": "http://example.com/cancel",
    "return_url": "http://example.com/return"
  },
  "payer": {
    "payment_method": "paypal"
  }
};


let request = new payments.PaymentCreateRequest();
request.requestBody(payment);

client.execute(request).then((response) => {
  console.log(response.statusCode);
  console.log(response.result);
}).catch((error) => {
  console.error(error.statusCode);
  console.error(error.message);
});
```

If you're migrating from v1, check out our [Migration Guide](./docs/Migrating.md) or our [Frequently Asked Questions](./docs/FAQ.md).

## Building

To try this out, update the version of `paypal-rest-sdk` in your `package.json` to `2.0.0-rc.1`.

Please feel free to create an issue in this repo with any feedback, questions, or concerns you have.

## Running tests

To run integration tests using your client id and secret, clone this repository and run the following command:
```sh
$ npm install
$ npm test
```

*NOTE*: This API is still in beta, is subject to change, and should not be used in production.

## Feedback

If you have any suggestions/remarks/feedback related to SDK 2.0.0, feel free to create an issue.

## License
PayPal-Node-SDK is open source. See the [LICENSE](./LICENSE) file for more info.

## Contributions
Pull requests and new issues are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.
