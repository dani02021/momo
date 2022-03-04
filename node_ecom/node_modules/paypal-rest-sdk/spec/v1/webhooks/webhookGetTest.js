'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebhookGetRequest = paypal.v1.webhooks.WebhookGetRequest;
const WebhookCreate = require('./webhookCreateTest').WebhookCreate;


describe('WebhookGetRequest', function () {
  it('works as expected', function () {
    return WebhookCreate().then((r) => {
      let request = new WebhookGetRequest(r.result.id);

      return client.execute(request).then((r) => {
        chai.assert.equal(r.statusCode, 200);
        chai.assert.isNotNull(r.result);
      });
    });
  });
});
