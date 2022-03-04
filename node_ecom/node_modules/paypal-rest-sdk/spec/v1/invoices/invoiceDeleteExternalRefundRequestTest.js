'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceDeleteExternalRefundRequest = paypal.v1.invoices.InvoiceDeleteExternalRefundRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;
const InvoiceRecordRefund = require('./invoiceRecordRefundRequestTest').InvoiceRecordRefund;
const InvoiceGet = require('./invoiceGetRequestTest').InvoiceGet;


describe('InvoiceDeleteExternalRefundRequest', function () {
  it('works as expected', function () {
    let invoiceId = '';
    return InvoiceCreate().then((createResp) => {
      invoiceId = createResp.result.id;
      return InvoiceRecordRefund(invoiceId);
    }).then(() => {
      return InvoiceGet(invoiceId);
    }).then((getResp) => {
      let refundId = getResp.result.refunds[0].transaction_id;
      let request = new InvoiceDeleteExternalRefundRequest(invoiceId, refundId);

      return client.execute(request);
    }).then((deleteRefundRequest) => {
      chai.assert.equal(deleteRefundRequest.statusCode, 204);
    });
  });
});
