'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const PlanCreate = require('./planCreateTest').PlanCreate;
const PlanUpdateRequest = paypal.v1.billingPlans.PlanUpdateRequest;
const PlanGetRequest = paypal.v1.billingPlans.PlanGetRequest;

function buildRequestBody() {
    return [{
        "op": "replace",
        "path": "/",
        "value": {
            "state": "ACTIVE"
        }
    }];
}

function planActivate(planId) {
    let activateRequest = new PlanUpdateRequest(planId);
    activateRequest.requestBody(buildRequestBody());
    return client.execute(activateRequest);
}

describe('PlanUpdateRequest', function () {
  it('works as expected', function () {
    return PlanCreate().then((r) => {
        let planId = r.result.id;
        return planActivate(planId).then((r) => {
            chai.assert.equal(r.statusCode, 200);

            let getRequest = new PlanGetRequest(planId);

            return client.execute(getRequest).then((r) => {
                chai.assert.equal(r.statusCode, 200);
                chai.assert.equal(r.result.state, "ACTIVE");
            });
        });
    });
  });
});

module.exports = {
    PlanActivate: planActivate
}
