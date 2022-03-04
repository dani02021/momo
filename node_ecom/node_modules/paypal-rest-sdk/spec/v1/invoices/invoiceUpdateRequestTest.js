'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceUpdateRequest = paypal.v1.invoices.InvoiceUpdateRequest;
const InvoiceCreate = require('./invoiceCreateRequestTest').InvoiceCreate;

function buildRequestBody() {
  return {
    'merchant_info': {
      'email': 'team-dx-clients-facilitator@getbraintree.com'
    },
    'terms': 'Consider this invoice updated.'
  };
}

describe('InvoiceUpdateRequest', function () {
  it('works as expected', function () {
    return InvoiceCreate().then((createResp) => {
      let request = new InvoiceUpdateRequest(createResp.result.id);
      request.notifyMerchant(false);
      request.requestBody(buildRequestBody());

      return client.execute(request)
    }).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);
    });
  });
});
