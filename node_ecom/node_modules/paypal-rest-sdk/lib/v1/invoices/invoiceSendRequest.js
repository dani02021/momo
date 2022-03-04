// This class was generated on Tue, 30 Jan 2018 14:07:40 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// invoiceSendRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/5STQW/aThDF7/9PMZqzhfm3N9+i0CpR1YQW1EsbhcE74G2XHbM7m9ZCfPdqsZNCQiP1gti345n3fmPv8IY2jBVa/yC25lFkb7DACcc62FateKxwxt5EIA9DVQHLDq4nBagAQZ2iyobD6Fsaj9/WSyf1j20S5cO5/62jBvHrXrkR5aqXy2MdLlbKATpJkG2cDMxiTd6LQuDDrdVhYHl+4jKU/fH2EIOc6wqIrKANw8KL2lV3v+FQN+R1AdvEoYOWAm04u8jRXJTeSX7ksfTIFqTWkDIcmtma8pwRTHhFySnYCAsNiRcjLPBTbj997B6x+rrDeddm9EsRx+SxwC8ULC0dDzt55hEL/MDdcPdiR9feZAcc4WfD2vQJnsy/YjjXHef7S4CLEKjrHY8L/Mxkbr3rsFqRi5yFbbKBzZMwDdJyUMsRK5+c298VeMVkOJxQuCvwvYTNc21K2pynFTVYv34Ja0h4b83rnOYNw/UEZHXCZWD1T0EzmvM5cw1H7ZtkMUuxFR/5WLsUr+yHMqS2dcNKyu9R8vtwpdp+ZG3EYIXT29kcezJYYfnwf9mbt349/ONY7v5g2JfDt/zuV8u1spkpaYqXYhirN+Px/r/fAAAA//8=
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Sends an invoice, by ID, to a customer.<blockquote><strong>Note:</strong> After you send an invoice, you cannot resend it.</blockquote><br/>Optionally, set the `notify_merchant` query parameter to also send the merchant an invoice update notification. Default is `true`.
 **/

class InvoiceSendRequest {

  constructor(invoiceId) {
    this.path = '/v1/invoicing/invoices/{invoice_id}/send?';
    this.path = this.path.replace('{invoice_id}', querystring.escape(invoiceId));
    this.verb = 'POST';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  notifyMerchant(notifyMerchant) {
    let params = querystring.escape(notifyMerchant);

    this.path += 'notify_merchant=' + params + '&';
    return this;
  }
}

module.exports = {InvoiceSendRequest: InvoiceSendRequest};
