'use strict';

require('../../spec_helper');

const AgreementCreateRequest = paypal.v1.billingAgreements.AgreementCreateRequest;
const chai = require('chai');
const client = require('../../test_harness').client();
const PlanCreate = require('../billingPlans/planCreateTest').PlanCreate;
const PlanActivate = require('../billingPlans/planUpdateTest').PlanActivate;

function buildRequestBody(planId) {
  return {
    "name": "Override Agreement",
    "description": "PayPal payment agreement that overrides merchant preferences and shipping fee and tax information.",
    "start_date": "2018-02-19T00:37:04Z",
    "payer": {
      "payment_method": "paypal",
      "payer_info": {
        "email": "payer@example.com"
      }
    },
    "plan": {
      "id": planId
    },
    "shipping_address": {
      "line1": "Hotel Staybridge",
      "line2": "Crooke Street",
      "city": "San Jose",
      "state": "CA",
      "postal_code": "95112",
      "country_code": "US"
    },
    "override_merchant_preferences": {
      "setup_fee": {
        "value": "3",
        "currency": "USD"
      },
      "return_url": "https://example.com/",
      "cancel_url": "https://example.com/cancel",
      "auto_bill_amount": "YES",
      "initial_fail_amount_action": "CONTINUE",
      "max_fail_attempts": "11"
    }
  }
}

function agreementCreate(planId) {
  let request = new AgreementCreateRequest();
  request.requestBody(buildRequestBody(planId));
  return client.execute(request);
}

describe('AgreementCreateRequest', function () {
  it('works as expected', function () {
    return PlanCreate().then((createResponse) => {
      let planId = createResponse.result.id;
      return PlanActivate(planId).then((activatedPlan) => {
        return agreementCreate(planId).then((r) => {
          chai.assert.equal(r.statusCode, 201);
          chai.assert.isNotNull(r.result);
        });
      });
    });
  });
});

module.exports = {
  AgreementCreate: agreementCreate
};

