'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const CreditCardGetRequest = paypal.v1.vault.CreditCardGetRequest;
const CreditCardCreate = require('./creditCardCreateTest').CreditCardCreate;

describe('CreditCardGetRequest', function () {
  it('works as expected', function () {
    return CreditCardCreate().then((r) => {
      let request = new CreditCardGetRequest(r.result.id);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
