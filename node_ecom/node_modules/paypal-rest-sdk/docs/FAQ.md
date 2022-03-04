# FAQ

## Q. Why did we create a new SDK that is different than 1.x ?
> We released 1.0 back in January 2015. In almost 2 years, we have made some big improvements to SDK, mostly derived from feature requests from developers like you. We tried to add all those features as much as we could, but few remained far fetched as they were breaking our current integration. All these issues will be fixed in 2.x. That required us to make some tiny breaking changes, but opens up a plethora of features that otherwise were inaccessible.
For e.g.
- **Retries** are currently not working as expected. Developers are not allowed to have full control over retry logic.
- **[PayPal-Request-Id](https://developer.paypal.com/docs/api/auth-headers/)** are auto-generated internally and are not working as expected. Developer can set a requestId but is not handled correctly, if you were to make the same call again yourself.
- **HTTPClient** is not accessible for advanced users who wish to use their own implementation for making calls to PayPal.
- **PayPal-Debug-Id** from a response is almost impossible to access. This id is used by PayPal to relate internal logs in case of any issues.

## Q. What do I need to do to migrate from 1.x to 2.x?
> You can follow our steps mentioned in [our migration guide](./Migrating.md).

## Q. What is PayPal-Request-ID and should I use it? How?
> As mentioned in our [developer docs](https://developer.paypal.com/docs/api/auth-headers/), `PayPal-Request-ID` contains a unique ID that you generate that can be used for enforcing idempotency. Omitting this header increases the risk of duplicate transactions.

> Using it is pretty simple. Just add a header to your request object as shown below:
```js
  let request = new PaymentCreateRequest();
  request.headers["PayPal-Request-ID"] = "abcd-request-id";
```

## Q. How will I retry in 2.x?
> NOTE: We highly recommend using a request id as shown above when performing retries, to prevent duplicate transactions.
> Retries are now much more simple. If your request fails for some reason and you want to try again, just resubmit the same HttpRequest object.

```js
const paypal = require('paypal-rest-sdk');
const invoices = paypal.v1.invoices;

let env = new paypal.core.SandboxEnvironment('YOUR_CLIENT_ID', 'YOUR_CLIENT_SECRET');

let client = new paypal.core.PayPalHttpClient(env);

// Sample function to help you retry
function tryAtMost(tries, executor) {
  console.log(`trying, tries = ${tries}`);
  --tries;
  return new Promise(executor)
    .catch(err => tries > 0 ? tryAtMost(tries, executor) : Promise.reject(err));
}

let request = new invoices.InvoiceCreateRequest();
// It is recommended to set `PayPal-Request-Id` header to ensure idempotency on retries.
request.headers['PayPal-Request-ID'] = "abcd-request-id";
request.requestBody(invoiceBody);

// Try maximum of 3 times
tryAtMost(3, (resolve, reject) => {
  client.execute(request).then((response) => {
    console.log(response.statusCode);
    // resolve on success
    resolve(response.result);
  }).catch((error) => {
    console.error(error.statusCode);
    console.error(error.message);
    // reject on failure
    reject(error);
  })
}).then((result) => {
  console.log("Result recieved");
  console.log(result);
}).catch((error) => {
  // If it still fails after multiple retries
  console.log("Failed after multiple retries");
});
```
