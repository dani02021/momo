'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const PaymentGetRequest = paypal.v1.payments.PaymentGetRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;

describe('PaymentGetRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('sale').then((createResponse) => {
      let request = new PaymentGetRequest(createResponse.result.id);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
