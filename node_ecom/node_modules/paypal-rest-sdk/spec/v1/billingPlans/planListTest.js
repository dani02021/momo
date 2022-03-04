'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const PlanListRequest = paypal.v1.billingPlans.PlanListRequest;
const PlanCreate = require('./planCreateTest').PlanCreate;


describe('PlanListRequest', function () {
  it('works as expected', function () {
    return PlanCreate().then((r) => {
        let request = new PlanListRequest();

        return client.execute(request).then((r) => {
          chai.assert.equal(r.statusCode, 200);
          chai.assert.isNotNull(r.result);

          // Add your own checks here
        });
    });
  });
});
