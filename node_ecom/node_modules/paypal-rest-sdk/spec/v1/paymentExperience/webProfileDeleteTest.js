'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebProfileDeleteRequest = paypal.v1.paymentExperience.WebProfileDeleteRequest;
const WebProfileCreate = require('./webProfileCreateTest').WebProfileCreate;

describe('WebProfileDeleteRequest', function () {
  it('works as expected', function () {
    return WebProfileCreate().then((r) => {
        let deleteRequest = new WebProfileDeleteRequest(r.result.id);

        return client.execute(deleteRequest).then((r) => {
          chai.assert.equal(r.statusCode, 204);
        });
    });
  });
});
