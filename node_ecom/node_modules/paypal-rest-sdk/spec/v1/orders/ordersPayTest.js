'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrdersPayRequest = paypal.v1.orders.OrdersPayRequest;
const CreateOrder = require('./ordersCreateTest').CreateOrder;

describe('OrdersPayRequest', function () {
  xit('pays an order', function () {
    // This test is an example, in production, orders will require payer approval

    let orderId = "73C032779K264335A";
    let request = new OrdersPayRequest(orderId);
    request.requestBody({
      "disbursement_mode": "INSTANT"
    });

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);

      chai.assert.equal(orderId, r.result.order_id);
      chai.assert.equal("APPROVED", r.result.status);
    });
  });
});
