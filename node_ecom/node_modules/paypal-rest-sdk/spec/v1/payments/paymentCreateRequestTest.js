'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const PaymentCreateRequest = paypal.v1.payments.PaymentCreateRequest;

function buildRequestBody(intent, paymentMethod, invoiceNumber) {
  paymentMethod = paymentMethod || 'credit_card';

  let body = {
    'intent': intent,
      'transactions': [{
        'amount': {
          'total': '10',
          'currency': 'USD'
        }
      }],
      'redirect_urls': {
        'cancel_url': 'http://paypal.com/cancel',
        'return_url': 'http://paypal.com/return'
      }
  };

  if (invoiceNumber) {
    body.transactions[0].invoice_number = invoiceNumber; 
  }

  if (paymentMethod === 'credit_card') {
    body.payer = {
      'payment_method': 'credit_card',
      'funding_instruments': [{
        'credit_card': {
          'billing_address': {
            'line1': '123 Townsend st',
            'line2': 'Suite 600',
            'city': 'San Francisco',
            'state': 'CA',
            'country_code': 'US',
            'postal_code': '94117'
          },
          'cvv2': '617',
          'expire_month': 1,
          'expire_year': 2020,
          'first_name': 'Joe',
          'last_name': 'shopper',
          'type': 'visa',
          'number': '4422009910903049'
        }
      }]
    }
  } else {
    body.payer = {
      'payment_method': 'paypal'
    }
  }

  return body
}

function paymentCreate(intent, paymentMethod, invoiceNumber) {
  let request = new PaymentCreateRequest();
  request.requestBody(buildRequestBody(intent, paymentMethod, invoiceNumber));
  return client.execute(request);
}

describe('PaymentCreateRequest', function () {
  it('works as expected', function () {
    return paymentCreate('sale').then((createResponse) => {
      chai.assert.equal(createResponse.statusCode, 201);
      chai.assert.isNotNull(createResponse.result);
    })
  });
});

module.exports = {
  PaymentCreate: paymentCreate
}
