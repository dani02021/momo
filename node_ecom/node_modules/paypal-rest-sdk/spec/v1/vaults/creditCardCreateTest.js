'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const CreditCardCreateRequest = paypal.v1.vault.CreditCardCreateRequest;

function buildRequestBody() {
  return JSON.parse('{ "number": "4417119669820331", "type": "visa", "expire_month": 11, "expire_year": 2055, "first_name": "Joe", "last_name": "Shopper", "billing_address": { "line1": "52 N Main St.", "city": "Johnstown", "country_code": "US", "postal_code": "43210", "state": "OH", "phone": "408-334-8890" } }');
}

function creditCardCreate() {
  let request = new CreditCardCreateRequest();
  request.requestBody(buildRequestBody());
  return client.execute(request);
}

describe('CreditCardCreateRequest', function () {
  it('works as expected', function () {
    return creditCardCreate().then((r) => {
      chai.assert.equal(r.statusCode, 201);
      chai.assert.isNotNull(r.result);
    });
  });
});

module.exports = {
  CreditCardCreate: creditCardCreate
}