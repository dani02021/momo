'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const CaptureRefundRequest = paypal.v1.payments.CaptureRefundRequest;
const AuthorizationCapture = require('./authorizationCaptureRequestTest').AuthorizationCapture;

function buildRequestBody() {
  return {
    "amount": {
      "total": "10",
      "currency": "USD"
    }
  };
}

describe('CaptureRefundRequest', function () {
  it('works as expected', function () {
    return AuthorizationCapture().then((captureResponse) => {
      let request = new CaptureRefundRequest(captureResponse.result.id);
      request.requestBody(buildRequestBody());
      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 201);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
