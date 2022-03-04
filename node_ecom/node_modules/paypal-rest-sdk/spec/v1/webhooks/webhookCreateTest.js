'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebhookCreateRequest = paypal.v1.webhooks.WebhookCreateRequest;
const WebhookDeleteRequest = paypal.v1.webhooks.WebhookDeleteRequest;
const WebhookListRequest = paypal.v1.webhooks.WebhookListRequest;

function buildRequestBody() { 
  //URL needs to be unique so just generating a random one
  let url = "https://example.com/" + Math.random().toString(36).substring(7);
  return JSON.parse('{ "url": "' + url + '", "event_types": [{ "name": "PAYMENT.AUTHORIZATION.CREATED" }, { "name": "PAYMENT.AUTHORIZATION.VOIDED" } ] }');
}

function WebhookList() {
  let request = new WebhookListRequest();
  return client.execute(request);
}

function WebhookDelete(id) {
  let request = new WebhookDeleteRequest(id);
  return client.execute(request);
}

function WebhookCreate() {
  let request = new WebhookCreateRequest();
  request.requestBody(buildRequestBody());
  return client.execute(request).catch((error) => {
      if (error.message.indexOf('WEBHOOK_NUMBER_LIMIT_EXCEEDED') > -1) {
        console.error("Reached maximum limit. Will try to remove all existing webhooks");
        return deleteAllWebhooks().then((r) => {
          return WebhookCreate();
        })
      } else {
        throw error;
      }
  });
}

function deleteAllWebhooks() {
  return WebhookList().then((r) => {
      let webhooks = r.result.webhooks;
      webhooks.forEach((webhook) => {
        return WebhookDelete(webhook.id).then((r) => {
          // ignoring
        }).catch((error) => {
          // ignoring
        });
      });
  });
}

describe('WebhookCreateRequest', function () {
  it('works as expected', function () {
    return WebhookCreate().then((r) => {
      chai.assert.equal(r.statusCode, 201);
      chai.assert.isNotNull(r.result);
    });
  });
});

module.exports = {
  WebhookCreate: WebhookCreate
}