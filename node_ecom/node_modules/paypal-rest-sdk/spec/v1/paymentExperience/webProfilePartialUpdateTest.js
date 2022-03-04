'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebProfilePartialUpdateRequest = paypal.v1.paymentExperience.WebProfilePartialUpdateRequest;
const WebProfileGetRequest = paypal.v1.paymentExperience.WebProfileGetRequest;
const WebProfileCreate = require('./webProfileCreateTest').WebProfileCreate;

function buildRequestBody() {
  return JSON.parse('[ { "op": "add", "path": "/presentation/brand_name", "value": "new_brand_name" }, { "op": "remove", "path": "/flow_config/landing_page_type" } ]');
}

describe('WebProfilePartialUpdateRequest', function () {
  it('works as expected', function () {
    return WebProfileCreate().then((r) => {
        let webProfileId = r.result.id;
        let partialUpdateRequest = new WebProfilePartialUpdateRequest(webProfileId);
        partialUpdateRequest.requestBody(buildRequestBody());

        return client.execute(partialUpdateRequest).then((r) => {
            chai.assert.equal(r.statusCode, 204);

            let getRequest = new WebProfileGetRequest(webProfileId);

            return client.execute(getRequest).then((r) => {
                chai.assert.equal(r.statusCode, 200);
                chai.assert.equal(r.result.presentation.brand_name, "new_brand_name");
            });
        });
    });
  });
});
