'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceRecordRefundRequest = paypal.v1.invoices.InvoiceRecordRefundRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;
const InvoiceRecordPayment = require('./invoiceRecordPaymentRequestTest').InvoiceRecordPayment;

function buildRequestBody() {
  return {
    amount: {
      value: '10',
      currency: 'USD'
    }
  };
}

/**
 * Records and refunds a payment on an invoice with the given id
 */
function invoiceRecordRefund(id) {
  return InvoiceRecordPayment(id).then(() => {
    let request = new InvoiceRecordRefundRequest(id);
    request.requestBody(buildRequestBody());

    return client.execute(request);
  });
}

describe('InvoiceRecordRefundRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then((createResp) => {
      return invoiceRecordRefund(createResp.result.id);
    }).then((resp) => {
      chai.assert.equal(resp.statusCode, 204);
    });
  });
});

module.exports = { 
  InvoiceRecordRefund: invoiceRecordRefund
}
