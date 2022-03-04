'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceDeleteRequest = paypal.v1.invoices.InvoiceDeleteRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;

describe('InvoiceDeleteRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then((r) => {
      let request = new InvoiceDeleteRequest(r.result.id);

      return client.execute(request);
    }).then((deleteResp) => {
      chai.assert.equal(deleteResp.statusCode, 204);
    });
  });
});
