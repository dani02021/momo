'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceRemindRequest = paypal.v1.invoices.InvoiceRemindRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;
const InvoiceSend = require('./invoiceSendRequestTest').InvoiceSend;

function buildRequestBody() {
  return {
    'subject': 'Past Due',
    'note': 'please pay soon',
    'send_to_merchant': true
  };
}

describe('InvoiceRemindRequest', function () {
  it('works as expected', function () {
    let invoiceId = ''
    return InvoiceCreate().then((createResp) => {
      invoiceId = createResp.result.id;
      return InvoiceSend(invoiceId);
    }).then((sendResp) => {
      let request = new InvoiceRemindRequest(invoiceId);
      request.requestBody(buildRequestBody());

      return client.execute(request);
    }).then((remindResp) => {
      chai.assert.equal(remindResp.statusCode, 202);
    });
  });
});
