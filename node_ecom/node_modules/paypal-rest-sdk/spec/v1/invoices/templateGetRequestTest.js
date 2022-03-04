'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const TemplateGetRequest = paypal.v1.invoices.TemplateGetRequest;
const TemplateCreate = require('./templateCreateRequestTest').TemplateCreate;

describe('TemplateGetRequest', function () {
  it('works as expected', function () {
    return TemplateCreate().then((r) => {

      let request = new TemplateGetRequest(r.result.template_id);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);

        // Add your own checks here
      });
    });
  });
});
