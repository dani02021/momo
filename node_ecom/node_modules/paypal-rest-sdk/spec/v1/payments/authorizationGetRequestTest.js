'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const AuthorizationGetRequest = paypal.v1.payments.AuthorizationGetRequest;
const PaymentCreate = require('./paymentCreateRequestTest').PaymentCreate;


describe('AuthorizationGetRequest', function () {
  it('works as expected', function () {
    return PaymentCreate('authorize').then((createResponse) => {
      let authId = createResponse.result.transactions[0].related_resources[0].authorization.id;
      let request = new AuthorizationGetRequest(authId);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
