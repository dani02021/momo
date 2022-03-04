'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const OrdersCreateRequest = paypal.v1.orders.OrdersCreateRequest;

function createOrder() {
  let request = new OrdersCreateRequest()
  let body = {
    "intent": "SALE",
    "purchase_units": [{
      "reference_id": "test_ref_id1",
      "amount": {
        "total": "100.00",
        "currency": "USD"
      }
    }, {
      "reference_id": "test_ref_id2",
      "amount": {
        "total": "50.00",
        "currency": "USD"
      }
    }],
    "redirect_urls": {
      "cancel_url": "https://example.com/cancel",
      "return_url": "https://example.com/return"
    }
  };

  request.requestBody(body);
  return client.execute(request);
}

describe('OrdersCreateRequest', function () {
  it('creates an order', function () {
    return createOrder().then((createResponse) => {
      chai.assert.equal(createResponse.statusCode, 201);
      chai.assert.isNotNull(createResponse.result);

      let createdOrder = createResponse.result;
      chai.assert.isNotNull(createdOrder.id);
      chai.assert.isNotNull(createdOrder.purchase_units);
      chai.assert.equal(2, createdOrder.purchase_units.length);

      let firstPurchaseUnit = createdOrder.purchase_units[0];
      chai.assert.equal("test_ref_id1", firstPurchaseUnit.reference_id);
      chai.assert.equal("USD", firstPurchaseUnit.amount.currency);
      chai.assert.equal("100.00", firstPurchaseUnit.amount.total);
      chai.assert.equal("NOT_PROCESSED", firstPurchaseUnit.status);

      let secondPurchaseUnit = createdOrder.purchase_units[1];
      chai.assert.equal("test_ref_id2", secondPurchaseUnit.reference_id);
      chai.assert.equal("USD", secondPurchaseUnit.amount.currency);
      chai.assert.equal("50.00", secondPurchaseUnit.amount.total);
      chai.assert.equal("NOT_PROCESSED", secondPurchaseUnit.status);

      chai.assert.equal("https://example.com/return", createdOrder.redirect_urls.return_url);
      chai.assert.equal("https://example.com/cancel", createdOrder.redirect_urls.cancel_url);

      chai.assert.isNotNull(createdOrder.create_time);

      chai.assert.isNotNull(createdOrder.links);

      var foundApprovalURL = false;
      for (let link of createdOrder.links) {
        if ("approval_url" === link.rel) {
          foundApprovalURL = true;
          chai.assert.isNotNull(link.href);
          chai.assert.equal("REDIRECT", link.method);
        }
      }
      chai.assert.isTrue(foundApprovalURL);

      chai.assert.equal("CREATED", createdOrder.status);
    });
  });
});

module.exports = {
  CreateOrder: createOrder
};