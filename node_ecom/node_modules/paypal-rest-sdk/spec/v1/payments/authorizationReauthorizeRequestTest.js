'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const AuthorizationReauthorizeRequest = paypal.v1.payments.AuthorizationReauthorizeRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;

function buildRequestBody() {
  return {
    "amount": {
      "total": "10",
      "currency": "USD"
    }
  };
}

describe('AuthorizationReauthorizeRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('authorize').then((createResponse) => {
      let authId = createResponse.result.transactions[0].related_resources[0].authorization.id;
      let request = new AuthorizationReauthorizeRequest(authId);
      request.requestBody(buildRequestBody());
      return client.execute(request).then((r) => {
        chai.assert.fail('This test relies on user interaction');
      }).catch((error) => {
        chai.assert.include(error.message, 'DCC_REAUTHORIZATION_NOT_ALLOWED');
      });
    });
  });
});
