// This class was generated on Tue, 30 Jan 2018 14:07:40 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// planUpdateRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/6yUQU/cPhDF7/9PMZqz/7u0hx5yQ9AKWhW2hfZSIZiNZ4mRYxt7Ao3QfvfKSbZssqiUiuO+HTvzm/c8D3hCNWOBwZKbNUGTMCo85FRGE8R4hwV+6+QEK8NWJzAOCJbGWuOuIZ9TsGzh+HAGxw6kYvh4dnoCkW8bTgJLr1sFxpW20QwEgaSswC9vuBSQigRS4NKsDKfusA8cKX8YxEPguPKxVuAdg49Q+8ibNsRD368CchoIHN/DHdmGYeUjMJXVUKD7IzNU+KXh2C4oUs3CMWHx40LhEZPmOFU/+FhPtQVJNdIe8LwNeX5JonHXqPA7RUNLy1tzvTQaFX7idtB2BnxeMRwfgl91E9ge7SNl7n4/Rmr7D+4p/MqkT51tsViRTZyF28ZE1lhIbFjhIuZhiuGEhWusXV/0NZykv+R3951ji+zMEwRZvhzsHHFM/xlD7Tug3G/G6u7fdr6zj0KwLQSKYsgOmN0fkZNvYslpAv3uj9CDsE39vD+r6OsR1CBMWAYCb5xwzC1mo6wv+6SaPvdC8ZoFtC+bmp1AvgruK1NW+UTt77gr6zI6g03jXVqzfpUrrh4fwIscfwK+s1w9OwEfRvzdz914jp5l6etg+YWZ/PcOA0k1DV71Fx7Rsw6RPPqzgRpvoVdG7NO/i9hlYsS4UXat6Hfc5v3MIGtXkSfpAe05gfPSbWIT8+7tk/caRBfrXJWCd4n7e7Ks8MA7YTesF8wNmt6B+U3yDhUeiYTPLJXXWOBi//zgCPu1igXO797MA7XZmTQftuD/eQum+cOwR9eo8P3PwKWwPhOSJh14zVi83dtb//cLAAD//w==
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Updates fields in a billing plan, by ID. In the JSON request body, include a patch object that specifies the operation to perform, one or more fields to update, and a new value for each updated field.
 **/

class PlanUpdateRequest {

  constructor(planId) {
    this.path = '/v1/payments/billing-plans/{plan_id}?';
    this.path = this.path.replace('{plan_id}', querystring.escape(planId));
    this.verb = 'PATCH';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  requestBody(patchRequest) {
    this.body = patchRequest;
    return this;
  }
}

module.exports = {PlanUpdateRequest: PlanUpdateRequest};
