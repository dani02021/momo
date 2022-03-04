'use strict';

require('../../spec_helper');

const PlanGetRequest = paypal.v1.billingPlans.PlanGetRequest;
const chai = require('chai');
const client = require('../../test_harness').client();
const PlanCreate = require('./planCreateTest').PlanCreate;


describe('PlanGetRequest', function () {
  it('works as expected', function () {
    return PlanCreate().then((r) => {
      let request = new PlanGetRequest(r.result.id);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
