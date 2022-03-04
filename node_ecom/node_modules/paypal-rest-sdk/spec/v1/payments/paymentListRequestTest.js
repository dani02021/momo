'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const PaymentListRequest = paypal.v1.payments.PaymentListRequest;

describe('PaymentListRequest', function () {
  it('works as expected', function () {
    let request = new PaymentListRequest();
    request.count(2);

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);
    });
  });
});
