'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceSearchRequest = paypal.v1.invoices.InvoiceSearchRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;

function buildRequestBody(number) {
  return {
    'number': number
  };
}

describe('InvoiceSearchRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then((createResp) => {
      let request = new InvoiceSearchRequest();
      request.requestBody(buildRequestBody(createResp.result.number));

      return client.execute(request)
    }).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);
    });
  });
});
