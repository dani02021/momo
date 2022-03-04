'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const RefundGetRequest = paypal.v1.payments.RefundGetRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;
const SaleRefund = require('./saleRefundRequestTest').SaleRefund;

describe('RefundGetRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('sale').then((createResponse) => {
      let saleId = createResponse.result.transactions[0].related_resources[0].sale.id;
      return SaleRefund(saleId);
    }).then((refundResponse) => {
      let request = new RefundGetRequest(refundResponse.result.id);
      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    })
  });
});
