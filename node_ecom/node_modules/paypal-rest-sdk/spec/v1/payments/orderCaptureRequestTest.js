'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrderCaptureRequest = paypal.v1.payments.OrderCaptureRequest;
const FAKE_ID = require('./orderGetRequestTest').FAKE_ID;

function buildRequestBody() {
  return {
    "amount": {
      "total":"10",
      "currency": "USD"
    },
    "is_final_capture": true
  };
}

describe('OrderCaptureRequest', function () {
  it('works as expected', function () {
    let request = new OrderCaptureRequest(FAKE_ID);
    request.requestBody(buildRequestBody());

    return client.execute(request).then((r) => {
      chai.assert.fail('This test is an example, relying on a fake id');
    }).catch((err) => {
      chai.assert.isNotNull(err);
      chai.assert.include(err.message, "debug_id");
    });
  });
});
