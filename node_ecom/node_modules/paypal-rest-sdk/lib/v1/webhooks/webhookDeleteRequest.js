// This class was generated on Tue, 30 Jan 2018 14:07:43 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// webhookDeleteRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/2SQzU7jMBSF9/MU1llbTWc0K+9QE9SKvwIVG1Qht74lhtQ29g0QVX13ZBIELdtPx77fOTtc6i1B4Y1WtffPI0MNMUGipLSONrD1DgrlJ05CiyEoxaoTs3IEieuWYjfXUW+JKSao+6XElLSheExPfdwes7nm+oDtsOhCdkocrXuExJ2OVq8aOnR9sAYSZ9QN+Jf0oiYxK4XfCK7pS1ywF33J7H4So+76c2OJG9LmyjUd1EY3iTJ4aW0kA8WxJYl59IEiW0pQrm2a/bLPUOL+kwwzSsG7RD/ZxDsmN8SgQ2jsWmfR4il5B4kpc7ggrr3Je1fn1aJCvw4Uite/hfNsN8OjVAx1UrH7nmMPieo90JrJ3LLmNk28Iah/4//7Px8AAAD//w==
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Deletes a webhook, by ID.
 **/

class WebhookDeleteRequest {

  constructor(webhookId) {
    this.path = '/v1/notifications/webhooks/{webhook_id}?';
    this.path = this.path.replace('{webhook_id}', querystring.escape(webhookId));
    this.verb = 'DELETE';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }
}

module.exports = {WebhookDeleteRequest: WebhookDeleteRequest};
