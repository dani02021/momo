# Migrating from Version 1 to Version 2

## 1. Initialize SDK

#### BEFORE
```js
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'your_client_id',
  'client_secret': 'your_client_secret'
});
```

#### AFTER
```js
const paypal = require('paypal-rest-sdk');

let env = new paypal.core.SandboxEnvironment('your_client_id', 'your_client_secret');
let client = new paypal.core.PayPalHttpClient(env);
```

# 2. Make a call

#### BEFORE
```js
var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    ...
};


paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
        throw error;
    } else {
        console.log("Create Payment Response");
        console.log(payment);
    }
});
```

#### AFTER
```js
const payments = paypal.v1.payments;

var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    ...
};

let request = new payments.PaymentCreateRequest();
request.requestBody(create_payment_json);

client.execute(request).then((response) => {
  console.log(response.statusCode);
  console.log(response.result);
}).catch((error) => {
  console.error(error.statusCode);
  console.error(error.message);
});
```

