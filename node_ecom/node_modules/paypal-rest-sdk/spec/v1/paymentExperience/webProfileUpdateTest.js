'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebProfileUpdateRequest = paypal.v1.paymentExperience.WebProfileUpdateRequest;
const WebProfileGetRequest = paypal.v1.paymentExperience.WebProfileGetRequest;
const WebProfileCreate = require('./webProfileCreateTest').WebProfileCreate;

describe('WebProfileUpdateRequest', function () {
  it('works as expected', function () {

    // Create
    return WebProfileCreate().then((r) => {
        let webProfile = r.result;
        webProfile.flow_config.bank_txn_pending_url = "https://updated.com"

        let updateRequest = new WebProfileUpdateRequest(r.result.id);
        updateRequest.requestBody(webProfile);

        // Update
        return client.execute(updateRequest).then((r) => {
          chai.assert.equal(r.statusCode, 204);

          // Get
          let getRequest = new WebProfileGetRequest(webProfile.id);
          return client.execute(getRequest).then((r) => {
              chai.assert.equal(r.statusCode, 200);
              chai.assert.equal(r.result.flow_config.bank_txn_pending_url, "https://updated.com")
          });
        });
    });
  });
});
