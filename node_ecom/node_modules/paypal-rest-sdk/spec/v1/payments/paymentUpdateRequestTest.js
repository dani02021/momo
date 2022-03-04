'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const PaymentUpdateRequest = paypal.v1.payments.PaymentUpdateRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;

function buildRequestBody() {
  return [{
    "path": "/transactions/0/amount",
    "op": "replace",
    "value": {
      "currency": "USD",
      "total": "11"
    }
  }];
}

describe('PaymentUpdateRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('sale', 'paypal').then((createResponse) => {
      let request = new PaymentUpdateRequest(createResponse.result.id);
      request.requestBody(buildRequestBody());
      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
      });
    });
  });
});
