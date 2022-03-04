'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const InvoiceListRequest = paypal.v1.invoices.InvoiceListRequest;


describe('InvoiceListRequest', function () {
  it('works as expected', function () {
    let request = new InvoiceListRequest();
    request.page(3);
    request.pageSize(7);
    request.totalCountRequired(false);

    return client.execute(request).then((getAllResp) => {
      chai.assert.equal(getAllResp.statusCode, 200);
      chai.assert.isNotNull(getAllResp.result);
    });
  });
});
