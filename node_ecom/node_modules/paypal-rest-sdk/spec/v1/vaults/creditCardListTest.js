'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const CreditCardListRequest = paypal.v1.vault.CreditCardListRequest;
const CreditCardCreate = require('./creditCardCreateTest').CreditCardCreate;

describe('CreditCardListRequest', function () {
  it('works as expected', function () {
    return CreditCardCreate().then((r) => {
        let request = new CreditCardListRequest();

        return client.execute(request).then((r) => {
          chai.assert.equal(r.statusCode, 200);
          chai.assert.isNotNull(r.result);

          // Add your own checks here
        });
    });
  });
});
