'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const WebProfileCreateRequest = paypal.v1.paymentExperience.WebProfileCreateRequest;

function buildRequestBody() {
  //Name needs to be unique so just generating a random one
  let profile_name = Math.random().toString(36).substring(7);
  return JSON.parse('{ "name": "' + profile_name +'", "flow_config": { "landing_page_type": "Billing", "bank_txn_pending_url": "http://www.yeowza.com/", "user_action": "commit", "return_uri_http_method": "GET" }, "presentation": { "logo_image": "http://www.yeowza.com/favico.ico", "brand_name": "YeowZa! Paypal", "locale_code": "US", "return_url_label": "Return", "note_to_seller_label": "Thanks!" }, "input_fields": { "allow_note": true, "no_shipping": 1, "address_override": 0 }, "temporary": true }');
}

function webProfileCreate() {
  let request = new WebProfileCreateRequest();
  request.requestBody(buildRequestBody());
  return client.execute(request);
}

describe('WebProfileCreateRequest', function () {
  it('works as expected', function () {
    return webProfileCreate().then((r) => {
      chai.assert.equal(r.statusCode, 201);
      chai.assert.isNotNull(r.result);
    });
  });
});

module.exports = {
  WebProfileCreate: webProfileCreate
}