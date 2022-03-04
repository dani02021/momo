// This class was generated on Tue, 30 Jan 2018 14:07:42 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// captureGetRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data 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
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Shows details for a captured payment, by ID.
 **/

class CaptureGetRequest {

  constructor(captureId) {
    this.path = '/v1/payments/capture/{capture_id}?';
    this.path = this.path.replace('{capture_id}', querystring.escape(captureId));
    this.verb = 'GET';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }
}

module.exports = {CaptureGetRequest: CaptureGetRequest};
