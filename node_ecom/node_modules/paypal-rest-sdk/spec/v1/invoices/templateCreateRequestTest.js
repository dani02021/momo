'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const TemplateCreateRequest = paypal.v1.invoices.TemplateCreateRequest;
const TemplateDeleteRequest = paypal.v1.invoices.TemplateDeleteRequest;
const TemplateListRequest = paypal.v1.invoices.TemplateListRequest;

function buildRequestBody() {
  return {
    "name": "Hours Template" + Math.random(),
    "default": true,
    "unit_of_measure": "Hours",
    "template_data": {
      "items": [
        {
          "name": "Nutri Bullet",
          "quantity": 1,
          "unit_price": {
            "currency": "USD",
            "value": "50.00"
          }
        }
      ],
      "merchant_info": {
			  "email": "team-dx-clients-facilitator@getbraintree.com",
      },
      "tax_calculated_after_discount": false,
      "tax_inclusive": false,
      "note": "Thank you for your business.",
      "logo_url": "https://pics.paypal.com/v1/images/redDot.jpeg",
      "allow_tip": true
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
  };
}

function TemplateList() {
  let request = new TemplateListRequest();
  return client.execute(request);
}

function TemplateDelete(id) {
  let request = new TemplateDeleteRequest(id);
  return client.execute(request);
}

function templateCreate() {
  let request = new TemplateCreateRequest();
  request.requestBody(buildRequestBody());
  return client.execute(request).catch((error) => {
      if (error.message.indexOf('Exceed maximum number of templates.') > -1) {
        console.error("Reached maximum limit. Will try to remove all existing templates");
        return deleteAllTemplates().then((r) => {
          return templateCreate();
        })
      } else {
        throw error;
      }
  });
}

function deleteAllTemplates() {
  return TemplateList().then((r) => {
      let templates = r.result.templates;
      templates.forEach((template) => {
        return TemplateDelete(template.template_id).then((r) => {
          // ignoring
        }).catch((error) => {
          // ignoring
        });
      });
  });
}
describe('TemplateCreateRequest', function () {
  it('works as expected', function () {
    return templateCreate().then((templateCreateResp) => {
      chai.assert.equal(templateCreateResp.statusCode, 201);
      chai.assert.isNotNull(templateCreateResp.result);
    });
  });
});

module.exports = { TemplateCreate: templateCreate }
