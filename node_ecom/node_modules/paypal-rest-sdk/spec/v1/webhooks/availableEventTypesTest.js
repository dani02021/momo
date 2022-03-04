'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const AvailableEventTypeListRequest = paypal.v1.webhooks.AvailableEventTypeListRequest;

describe('AvailableEventTypeListRequest', function () {
  it('works as expected', function () {
    let request = new AvailableEventTypeListRequest();

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);
      chai.assert.isNotNull(r.result.event_types);
      chai.assert.isAtLeast(r.result.event_types.length, 1);
    });
  });
});
