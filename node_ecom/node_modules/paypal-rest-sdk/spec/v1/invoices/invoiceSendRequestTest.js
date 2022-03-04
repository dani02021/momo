'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceSendRequest = paypal.v1.invoices.InvoiceSendRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;

function invoiceSend(id) {
  let request = new InvoiceSendRequest(id);
  request.notifyMerchant(false);
  return client.execute(request);
}

describe('InvoiceSendRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then((r) => {
      return invoiceSend(r.result.id)
    }).then((r) => {
      chai.assert.equal(r.statusCode, 202);
    });
  });
});

module.exports = {InvoiceSend: invoiceSend}
