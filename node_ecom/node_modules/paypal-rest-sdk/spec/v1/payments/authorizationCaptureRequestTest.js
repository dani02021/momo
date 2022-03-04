'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const AuthorizationCaptureRequest = paypal.v1.payments.AuthorizationCaptureRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;

function buildRequestBody() {
  return {
    "amount": {
      "total": "10",
      "currency": "USD"
    },
    "is_final_capture": true
  };
}

function authorizationCapture() {
  return PaymentCreate('authorize').then((createResponse) => {
    let authId = createResponse.result.transactions[0].related_resources[0].authorization.id;
    let request = new AuthorizationCaptureRequest(authId);
    request.requestBody(buildRequestBody());

    return client.execute(request);
  });
}

describe('AuthorizationCaptureRequest', function () {
  it('works as expected', function () {
    return authorizationCapture().then((authResponse) => {
      chai.assert.equal(authResponse.statusCode, 200);
      chai.assert.isNotNull(authResponse.result);
    });
  });
});

module.exports = {
  AuthorizationCapture: authorizationCapture
};
