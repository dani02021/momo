'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const PaymentExecuteRequest = paypal.v1.payments.PaymentExecuteRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;

function buildRequestBody() {
  return {
    payer_id: 'some-payer-id'
  };
}

describe('PaymentExecuteRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('order', 'paypal').then((createResponse) => {
      let request = new PaymentExecuteRequest(createResponse.result.id);
      request.requestBody(buildRequestBody());

      return client.execute(request).then((r) => {
        chai.assert.fail('This test relies on user approval');
      }).catch((error) => {
        chai.assert.include(error.message, 'PAYMENT_NOT_APPROVED_FOR_EXECUTION');
      });
    });
  });
});
