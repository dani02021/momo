'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const SaleGetRequest = paypal.v1.payments.SaleGetRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;

describe('SaleGetRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('sale').then((createResponse) => {
      let saleId = createResponse.result.transactions[0].related_resources[0].sale.id;
      let request = new SaleGetRequest(saleId);
      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);

        // Add your own checks here
      });
    });
  });
});
