'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceDeleteExternalPaymentRequest = paypal.v1.invoices.InvoiceDeleteExternalPaymentRequest;
const InvoiceRecordPayment = require('./invoiceRecordPaymentRequestTest').InvoiceRecordPayment;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;
const InvoiceGet = require('./invoiceGetRequestTest').InvoiceGet;

describe('InvoiceDeleteExternalPaymentRequest', function () {
  it('works as expected', function () {
    let invoiceId = '';
    return InvoiceCreate().then((createResp) => {
      invoiceId = createResp.result.id;
      return InvoiceRecordPayment(invoiceId);
    }).then(() => {
      return InvoiceGet(invoiceId);
    }).then((invoiceGetResp) => {
      let txnId = invoiceGetResp.result.payments[0].transaction_id;
      let request = new InvoiceDeleteExternalPaymentRequest(invoiceId, txnId);
      return client.execute(request);
    }).then((deletePaymentResp) => {
      chai.assert.equal(deletePaymentResp.statusCode, 204);
    });
  });
});
