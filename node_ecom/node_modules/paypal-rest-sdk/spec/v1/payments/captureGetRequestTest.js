'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const CaptureGetRequest = paypal.v1.payments.CaptureGetRequest;
const AuthorizationCapture = require('./authorizationCaptureRequestTest').AuthorizationCapture;

describe('CaptureGetRequest', function () {
  it('works as expected', function () {
    return AuthorizationCapture().then((captureResponse) => {
      let request = new CaptureGetRequest(captureResponse.result.id);
      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
