'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const SaleRefundRequest = paypal.v1.payments.SaleRefundRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;

function buildRequestBody() {
  return {};
}

function saleRefund(saleId) {
  let request = new SaleRefundRequest(saleId);
  request.requestBody(buildRequestBody());
  return client.execute(request);
}

describe('SaleRefundRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('sale').then((createResponse) => {
      let saleId = createResponse.result.transactions[0].related_resources[0].sale.id;

      saleRefund(saleId).then((r) => {
        chai.assert.equal(r.statusCode, 201);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});

module.exports = {
  SaleRefund: saleRefund
}
