'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrderGetRequest = paypal.v1.payments.OrderGetRequest;

const FAKE_ID = 'O-2FK09787H36911800';

describe('OrderGetRequest', function () {
  xit('Tests that use this class must be ignored when run in an automated environment because executing an order will require approval via the executed payment\'s approval_url', function () {
    let request = new OrderGetRequest(FAKE_ID);

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);
    });
  });
});

module.exports = {
  FAKE_ID: FAKE_ID
}
