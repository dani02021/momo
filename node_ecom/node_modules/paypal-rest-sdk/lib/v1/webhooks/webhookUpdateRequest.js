// This class was generated on Tue, 30 Jan 2018 14:07:43 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// webhookUpdateRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/7xYQXPbuhG+91fsID3YGUp0O02a6uZJ0nHaNFZtpT14POaKXImIQYABQCuajP/7mwVAWZTiOH4v8UmDBRb8PnyL3YW+ig/YkJiIFc1rY67HXVuhJ5GJN+RKK1svjRYTcUatwpIcpHWwkKQqByvpa9C0ghtUHbkxnHdta6x3YLRag68JCht9CzAtWeQNxzBF5wCh+OSMvmrRl3UBZv6JSh+3/IYToK6gaNHXRQarWpY1SAdF3llVwMJYQPh49h6MhSKnG9L+yq9bcnEuGNwYZgwoYC3Ym6SvyQaYyRdBSefBLHoXkYn/dmTXU7TYkCfrxOTiMhMnhBXZXes/jW12bVP09cD2VczWLR+681bqpcjE/9BKnCsainElK5GJf9M6mfdUYTbv3jBYZtBL4w1EFRn7sbW4jp87ysQZYXWq1VpMFqgcseFzJy1VYuJtR5mYWj5vL8mJie6Uur2Ma8j5uMkG+7/OTz/AlJXbxx8EvbLRb0Bhd2bI51gDMl5mFPYPy1NgOCaGbavW0KL1ElWiGSYsOdPZktwO6ZffJZ0M26wfVmdhTTMglQw7XBIDI7XnEDNBI2XKGMxSh7FHuyQPlSm7hrQH3ioFtzfQmBsKy0LEjqEHHkI63C1esX2xHqP4N8gHybMHT8C0A/5huB+ZdzfXGyhN0yp6ZEz+foScJnYDr/4BjfBBhdDf6dOTCgt/lQgx+vcphpgYcOwt+1KEmc39SWnQ0k70QGXIgTYebMQHmCLvZzC6vOVVrjXa0U4u+X/MXPscv5/+TjVxym6MvUt+KVf8UcR3WeAtlwEIgz14W2VmgHRovz/HdW3IC6RTseHRJrhcN2e/OcHadLYnOIbZ9hRLqlTvLnWpukrqZSjJyYiOw3MNyHpWFVUZuJZKuYjlGZ0nK901HBTPi0NYSVVBibYKH0pVOOaaQVENHIY7Fc+LHfdQShmfi10BVQlUBhdx7gal4gNN9suDZxvTKJhG/L0xLz58VGbfL2cPJ/ZqS6htOYf23RRSdw3qkSWsApGtxX1hDkSeKPFp/tkGnwz7OaHT8nOXwAGveiKEzqPvhvdlY9pHGaf4JHFzx3/eeV7+AN6dJiwMf6AN+8mn+V7qa9j6LJzeUxaU1NfD0+0t9+eh1I+NLCnkS3pxcjx7e3p8DsH18iCvTOlybGVeoyeDbhQm8sNf32zVlhYDNsmwr8BdMY4V++PZ+5CEGryOCaxnV6JSGS+fSx1nGvK1qeLLw9fSBd4ZdwAXH8/egaemZVduuxr0lwe1962b5Lk3RrmxJL8YG7vMa9+o3C7Kly/+fnQ4hnchG6fk+ecig+KgyOIr5rCAskaLJb8IQjfXWhq11pTknNTLVKGZa3in8BbXtIZeF+ZqNF9cX6OPMgFujiByjHwwVAsWWPtgfqJrHs90IN3GtC/eyWw27WWwfZfr7xHviRhYUgP4cbyP/YKPPwIMze66pQdD5MU/Xr165qhkj9HfDvsHrSN7Q6Fko+aUskgvUn0dhe40NnO57Ezn1DqVmjnF+HDUoPaydH0iYrcxnBPBRcgeZwmhu0O3Wq3GEjUGbOicXGpucl3OvqOe0u5w/IVpHD5ZBu7sUIg43heCn/DhmKSD0uiFXHYpjLh/IA1GQ8H9vaqN8/GPAalL03DHVExPz2cFd79yIdMToCHncBnOFz1v6VGmXg2kjtngsQ3/fe/s20y8NtqTTg9twa16ApJ/cqH1OPG+/U+8RBMxPZ69PhHx7wUxEfnNX/Jt8C5PhcjlX+/+T7gVmXj7paXSU3UeSutrU5GY/PXo6PZPvwEAAP//
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Replaces webhook fields with new values. Supports only the `replace` operation. Pass a `json_patch` object with `replace` operation and `path`, which is `/url` for a URL or `/event_types` for events. The `value` is either the URL or a list of events.
 **/

class WebhookUpdateRequest {

  constructor(webhookId) {
    this.path = '/v1/notifications/webhooks/{webhook_id}?';
    this.path = this.path.replace('{webhook_id}', querystring.escape(webhookId));
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

module.exports = {WebhookUpdateRequest: WebhookUpdateRequest};
