'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebhookDeleteRequest = paypal.v1.webhooks.WebhookDeleteRequest;
const WebhookCreate = require('./webhookCreateTest').WebhookCreate;

describe('WebhookDeleteRequest', function () {
  it('works as expected', function () {
    return WebhookCreate().then((r) => {
        let deleteRequest = new WebhookDeleteRequest(r.result.id);

        return client.execute(deleteRequest).then((r) => {
          chai.assert.equal(r.statusCode, 204);
        });
    });
  });
});
