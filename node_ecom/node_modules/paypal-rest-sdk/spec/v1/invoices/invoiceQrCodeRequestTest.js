'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceQrCodeRequest = paypal.v1.invoices.InvoiceQrCodeRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;

describe('InvoiceQrCodeRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then((r) => {
      let request = new InvoiceQrCodeRequest(r.result.id);
      request.height(5);
      request.width(6);

      return client.execute(request)
    }).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);
    });
  });
});
