'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const SearchGetRequest = paypal.v1.sync.SearchGetRequest;

describe('SearchGetRequest', function () {
  it('retrieves a specific transaction', function () {
    let transactionId = "4LJ583775B2362642";
    let request = new SearchGetRequest();
    request.transactionId(transactionId);

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);

      chai.assert.isNotNull(r.result.transaction_details);
      chai.assert.equal(r.result.total_items, 1);

      let transaction_details = r.result.transaction_details[0];
      chai.assert.isNotNull(transaction_details);

      let transaction_info = transaction_details.transaction_info;
      chai.assert.isNotNull(transaction_info);
      chai.assert.equal(transaction_info.transaction_id, transactionId);
      chai.assert.equal(transaction_info.transaction_amount.currency_code, "USD");
      chai.assert.equal(transaction_info.transaction_amount.value, "10.00");
    });
  });

  it('retrieves a range of transactions', function () {
    let transactionId = "4LJ583775B2362642";
    let request = new SearchGetRequest();
    request.startDate("2018-01-22T00:00:00+00:00");
    request.endDate("2018-01-23T00:00:00+00:00");

    return client.execute(request).then((r) => {
      chai.assert.equal(r.statusCode, 200);
      chai.assert.isNotNull(r.result);

      chai.assert.isNotNull(r.result.transaction_details);
      chai.assert.equal(r.result.total_items, 77);

      let transaction_details = r.result.transaction_details;
      chai.assert.isNotNull(transaction_details);
      chai.assert.equal(transaction_details.length, 77);
    });
  });
});
