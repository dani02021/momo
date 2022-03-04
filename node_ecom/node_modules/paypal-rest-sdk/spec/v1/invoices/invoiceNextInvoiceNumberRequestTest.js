'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceNextInvoiceNumberRequest = paypal.v1.invoices.InvoiceNextInvoiceNumberRequest;


describe('InvoiceNextInvoiceNumberRequest', function () {
  it('works as expected', function () {
    let request = new InvoiceNextInvoiceNumberRequest();

    return client.execute(request).then((numberResp) => {
      chai.assert.equal(numberResp.statusCode, 200);
      chai.assert.isNotNull(numberResp.result);
    });
  });
});
