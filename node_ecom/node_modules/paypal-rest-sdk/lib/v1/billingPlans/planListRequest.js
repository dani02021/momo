// This class was generated on Tue, 30 Jan 2018 14:07:39 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// planListRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data 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
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Lists billing plans. To filter the plans that appear in the response, specify one or more optional query and pagination parameters.
 **/

class PlanListRequest {

  constructor() {
    this.path = '/v1/payments/billing-plans/?';
    this.verb = 'GET';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  page(page) {
    let params = querystring.escape(page);

    this.path += 'page=' + params + '&';
    return this;
  }

  pageSize(pageSize) {
    let params = querystring.escape(pageSize);

    this.path += 'page_size=' + params + '&';
    return this;
  }

  status(status) {
    let params = querystring.escape(status);

    this.path += 'status=' + params + '&';
    return this;
  }

  totalRequired(totalRequired) {
    let params = querystring.escape(totalRequired);

    this.path += 'total_required=' + params + '&';
    return this;
  }
}

module.exports = {PlanListRequest: PlanListRequest};
