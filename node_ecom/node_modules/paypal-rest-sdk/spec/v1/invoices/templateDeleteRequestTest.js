'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const TemplateDeleteRequest = paypal.v1.invoices.TemplateDeleteRequest;
const TemplateCreate = require('./templateCreateRequestTest').TemplateCreate;

describe('TemplateDeleteRequest', function () {
  it('works as expected', function () {
    return TemplateCreate().then((r) => {

      let request = new TemplateDeleteRequest(r.result.template_id);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 204);

        // Add your own checks here
      });
    });
  });
});
