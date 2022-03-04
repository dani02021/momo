'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrdersCancelRequest = paypal.v1.orders.OrdersCancelRequest;
const OrdersGetRequest = paypal.v1.orders.OrdersGetRequest;
const CreateOrder = require('./ordersCreateTest').CreateOrder;

describe('OrdersCancelRequest', function () {
  it('cancels an order', function () {
    return CreateOrder().then((createOrderResponse) => {
      chai.assert.equal(createOrderResponse.statusCode, 201);
      let getRequest = new OrdersGetRequest(createOrderResponse.result.id);
      return client.execute(getRequest).then((getOrderResponse) => {
        chai.assert.equal(200, getOrderResponse.statusCode);

        let request = new OrdersCancelRequest(createOrderResponse.result.id);
        return client.execute(request).then((r) => {
          chai.assert.equal(204, r.statusCode);

          let getRequest = new OrdersGetRequest(createOrderResponse.result.id);
          return client.execute(getRequest).then((getOrderResponse) => {
            chai.assert.fail('Should not respond with a resource.');
          }).catch((error) => {
            chai.assert.equal(404, error.statusCode);
          });
        });
      });
    });
  });
});
