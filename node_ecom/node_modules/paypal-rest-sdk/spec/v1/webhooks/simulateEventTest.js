'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const SimulateEventRequest = paypal.v1.webhooks.SimulateEventRequest;

function buildRequestBody() { 
  //URL needs to be unique so just generating a random one
  return JSON.parse('{ "url": "https://www.ebay.com/paypal_webhook", "event_type": "PAYMENT.AUTHORIZATION.CREATED" }');
}

describe('SimulateEventRequest', function () {
  it('works as expected', function () {
    let request = new SimulateEventRequest();
    request.requestBody(buildRequestBody());

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 202);
      chai.assert.isNotNull(r.result);
    });
  });
});
