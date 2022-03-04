'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceGetRequest = paypal.v1.invoices.InvoiceGetRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;

function invoiceGet(id) {
  let request = new InvoiceGetRequest(id);
  return client.execute(request)
}

describe('InvoiceGetRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then(function(r) {
      return invoiceGet(r.result.id);
    }).then((getResp) => {
      chai.assert.equal(getResp.statusCode, 200);
      chai.assert.isNotNull(getResp.result);
    });
  });
});

module.exports = {
  InvoiceGet: invoiceGet
}
