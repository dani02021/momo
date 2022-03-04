// This class was generated on Tue, 30 Jan 2018 14:07:42 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// orderCaptureRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data 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
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Captures a payment for an order, by ID. To use this call, the original payment call must specify an `order` intent. In the JSON request body, include the payment amount and indicate whether this capture is the final capture for the authorization.
 **/

class OrderCaptureRequest {

  constructor(orderId) {
    this.path = '/v1/payments/orders/{order_id}/capture?';
    this.path = this.path.replace('{order_id}', querystring.escape(orderId));
    this.verb = 'POST';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  requestBody(capture) {
    this.body = capture;
    return this;
  }
}

module.exports = {OrderCaptureRequest: OrderCaptureRequest};
