'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrderVoidRequest = paypal.v1.payments.OrderVoidRequest;
const FAKE_ID = require('./orderGetRequestTest').FAKE_ID;

describe('OrderVoidRequest', function () {
  it('works as expected', function () {
    let request = new OrderVoidRequest(FAKE_ID);

    return client.execute(request).then((r) => {
      chai.assert.fail('This test is an example, relying on a fake id');
    }).catch((error) => {
      chai.assert.include(error.message, 'debug_id');
    });
  });
});
