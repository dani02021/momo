'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceRecordPaymentRequest = paypal.v1.invoices.InvoiceRecordPaymentRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;
const InvoiceSend = require('./invoiceSendRequestTest').InvoiceSend;

function buildRequestBody() {
  return {
    method: 'CASH',
    date: '2017-07-11 00:01:00 PST',
    amount: {
      value: '10',
      currency: 'USD'
    }
  };
}

/**
 * Sends and creates a payment on an invoice with the given id
 */
function invoiceRecordPayment(id) {
  return InvoiceSend(id).then(() => {
    let request = new InvoiceRecordPaymentRequest(id);
    request.requestBody(buildRequestBody());

    return client.execute(request);
  })
}

describe('InvoiceRecordPaymentRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then((resp) => {
      return resp.result.id;
    }).then((id) => {
      return invoiceRecordPayment(id);
    }).then((invoicePaymentResp) => {
      chai.assert.equal(invoicePaymentResp.statusCode, 204);
    });
  });
});

module.exports = {
  InvoiceRecordPayment: invoiceRecordPayment
}
