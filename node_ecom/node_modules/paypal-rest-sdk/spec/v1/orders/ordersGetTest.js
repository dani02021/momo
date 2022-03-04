'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrdersGetRequest = paypal.v1.orders.OrdersGetRequest;
const CreateOrder = require('./ordersCreateTest').CreateOrder;

describe('OrdersGetRequest', function () {
  it('retrieves an order', function () {
    return CreateOrder().then((createOrderResponse) => {
      chai.assert.equal(createOrderResponse.statusCode, 201);
      let getRequest = new OrdersGetRequest(createOrderResponse.result.id);
      return client.execute(getRequest).then((getOrderResponse) => {
        chai.assert.equal(getOrderResponse.statusCode, 200);
        chai.assert.isNotNull(getOrderResponse.result);

        let createdOrder = createOrderResponse.result
        let retrievedOrder = getOrderResponse.result

        chai.assert.equal(createdOrder.id, retrievedOrder.id);
        chai.assert.equal(createdOrder.purchase_units.length, retrievedOrder.purchase_units.length);

        chai.assert.equal(createdOrder.redirect_urls.return_url, retrievedOrder.redirect_urls.return_url);
        chai.assert.equal(createdOrder.redirect_urls.cancel_url, retrievedOrder.redirect_urls.cancel_url);

        chai.assert.equal(createdOrder.create_time, retrievedOrder.create_time);
        chai.assert.isNotNull(retrievedOrder.links);

        var foundApprovalURL = false;
        for (let link of retrievedOrder.links) {
          if ("approval_url" === link.rel) {
            foundApprovalURL = true;
            chai.assert.isNotNull(link.href);
            chai.assert.equal("REDIRECT", link.method);
          }
        }
        chai.assert.isTrue(foundApprovalURL);

        chai.assert.equal("CREATED", retrievedOrder.status);
      });
    });
  });
});

