'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const TemplateUpdateRequest = paypal.v1.invoices.TemplateUpdateRequest;
const TemplateCreate = require('./templateCreateRequestTest').TemplateCreate;

function buildRequestBody() {
	return {
		"name": "Hours Template_" + Math.random(),
		"default": true,
		"unit_of_measure": "HOURS",
		"template_data": {
			"items": [{
				"name": "Nutri Bullet",
				"quantity": 2,
				"unit_price": {
					"currency": "USD",
					"value": "50.00"
				}
			}
			],
			"merchant_info": {
				"email": "team-dx-clients-facilitator@getbraintree.com"
			},
			"tax_calculated_after_discount": false,
			"tax_inclusive": false,
			"note": "Thank you for your business.",
			"logo_url": "https://pics.paypal.com/v1/images/redDot.jpeg"
		},
		"settings": [
			{
				"field_name": "items.date",
				"display_preference": {
					"hidden": true
				}
			},
			{
				"field_name": "custom",
				"display_preference": {
					"hidden": true
				}
			}
		]
	} ;
}

describe('TemplateUpdateRequest', function () {
	it('works as expected', function () {
		return TemplateCreate().then((r) => {
			let request = new TemplateUpdateRequest(r.result.template_id);
			request.requestBody(buildRequestBody());

			return client.execute(request).then((r) => {
				chai.assert.equal(r.statusCode, 200);
				chai.assert.isNotNull(r.result);

			});
		});
	});
});
