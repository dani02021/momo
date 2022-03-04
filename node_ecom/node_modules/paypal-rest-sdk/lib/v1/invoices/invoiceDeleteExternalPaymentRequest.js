// This class was generated on Tue, 30 Jan 2018 14:07:40 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// invoiceDeleteExternalPaymentRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/6yST2/TQBDF73yK1ZyXOnD0DTVBrfgXIOKCqmjqfakX2bvL7LjUivLd0dYuTQoSQuJm/fQ8fr8Z7+k996CafLiNvsGZQwfFFncKCdxtE489gpKlJXIjPqmPgWpa3uey4WAesmbOWnM9mnmeuVwaDs6ocMjclJfN5fKMLH0cIOOahXsoJFP99crSBdhBntLXUfqnbM3anrA9bcZUTLKKDzdk6QuL5+sOp4Zb78jSG4wz/s1s0963jjujLX557CT25kfrm9ZoNNOWDD8oH/sVuVciPE59FpY+gd2H0I1U77jLKOD74AWOapUBltYSE0Q9MtVh6LqD/avN0Qf/0egPlR+V/kf5qymDrNOQAgvKKYaMY3YegyLMMeKUOt9wKVR9yzGQpQvV9A7aRld+udXb1WZF0+2ppur2RTWdx4eb+Qm52j8e+lDNss8FTRSXq/3p3g5kaXWX0CjcZ2Ud8nl0oPrlYnF49hMAAP//
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Deletes an external payment, by invoice ID and transaction ID.
 **/

class InvoiceDeleteExternalPaymentRequest {

  constructor(invoiceId, transactionId) {
    this.path = '/v1/invoicing/invoices/{invoice_id}/payment-records/{transaction_id}?';
    this.path = this.path.replace('{invoice_id}', querystring.escape(invoiceId));
    this.path = this.path.replace('{transaction_id}', querystring.escape(transactionId));
    this.verb = 'DELETE';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }
}

module.exports = {InvoiceDeleteExternalPaymentRequest: InvoiceDeleteExternalPaymentRequest};
