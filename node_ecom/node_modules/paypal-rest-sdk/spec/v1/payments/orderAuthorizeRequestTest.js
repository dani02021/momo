'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrderAuthorizeRequest = paypal.v1.payments.OrderAuthorizeRequest;
const FAKE_ID = require('./orderGetRequestTest').FAKE_ID;

function buildRequestBody() {
  return {
    "amount": {
      "currency": "USD",
      "total": "10"
    }
  };
}

describe('OrderAuthorizeRequest', function () {
  it('works as expected', function () {
    let request = new OrderAuthorizeRequest(FAKE_ID);
    request.requestBody(buildRequestBody());

    return client.execute(request).then((r) => {
      chai.assert.fail('This test is an example, relying on a fake id');
    }).catch((err) => {
      chai.assert.isNotNull(err); // Expect this to fail, order ID doesn't exist
      chai.assert.include(err.message, "debug_id");
    });
  });
});
