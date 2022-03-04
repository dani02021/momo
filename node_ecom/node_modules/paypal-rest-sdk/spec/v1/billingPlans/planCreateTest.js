'use strict';

require('../../spec_helper');

const PlanCreateRequest = paypal.v1.billingPlans.PlanCreateRequest;
const chai = require('chai');
const client = require('../../test_harness').client();

function buildRequestBody() {
  return {
    "payment_definitions": [{
      "amount": {
        "value": "100",
        "currency": "USD"
      },
      "frequency": "MONTH",
      "cycles": "12",
      "frequency_interval": "2",
      "type": "REGULAR",
      "name": "Regular Payments",
      "charge_models": [{
        "type": "SHIPPING",
        "amount": {
          "value": "10",
          "currency": "USD"
        }
      }, {
        "type": "TAX",
        "amount": {
          "value": "12",
          "currency": "USD"
        }
      }]
    }],
    "merchant_preferences": {
      "return_url": "http://localhost:3000/subscription/success",
      "cancel_url": "http://localhost:3000/subscription/cancel"
    },
    "name": "T-Shirt of the Month Club Plan",
    "description": "Template creation.",
    "type": "fixed"
  }
}

function planCreate() {
  let request = new PlanCreateRequest();
  request.requestBody(buildRequestBody());
  return client.execute(request);
}

describe('PlanCreateRequest', function () {
  it('works as expected', function () {
    return planCreate().then((r) => {
      chai.assert.equal(r.statusCode, 201);
      chai.assert.isNotNull(r.result);
    });
  });
});

module.exports = {
  PlanCreate: planCreate
};
