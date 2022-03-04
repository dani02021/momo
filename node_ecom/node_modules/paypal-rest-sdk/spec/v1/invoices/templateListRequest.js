'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const TemplateListRequest = paypal.v1.invoices.TemplateListRequest;


describe('TemplateListRequest', function () {
  it('works as expected', function () {
    let request = new TemplateListRequest();
    request.fields('all');

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);

    });
  });
});
