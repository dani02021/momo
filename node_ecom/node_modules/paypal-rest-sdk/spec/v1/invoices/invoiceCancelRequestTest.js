'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceCancelRequest = paypal.v1.invoices.InvoiceCancelRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;
const InvoiceSend = require('./invoiceSendRequestTest').InvoiceSend;

function buildRequestBody() {
  return {
    "subject": "Past Due",
    "note": "Nevermind!",
    "send_to_merchant": true,
    "send_to_payer": true,
  };
}

describe('InvoiceCancelRequest', function () {
  it('works as expected', function () {
    let invoiceId = '';
    return InvoiceCreate().then((createResp) => {
      invoiceId = createResp.result.id;
      return InvoiceSend(invoiceId)
    }).then((sendResp) => {
      let request = new InvoiceCancelRequest(invoiceId);
      request.requestBody(buildRequestBody());

      return client.execute(request);
    }).then((cancelResp) => {
      chai.assert.equal(cancelResp.statusCode, 204);
    });
  });
});
