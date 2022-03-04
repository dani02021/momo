'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebProfileGetRequest = paypal.v1.paymentExperience.WebProfileGetRequest;
const WebProfileCreate = require('./webProfileCreateTest').WebProfileCreate;


describe('WebProfileGetRequest', function () {
  it('works as expected', function () {
    return WebProfileCreate().then((r) => {
      let request = new WebProfileGetRequest(r.result.id);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
