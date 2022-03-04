// This class was generated on Tue, 30 Jan 2018 14:07:40 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// invoiceRecordRefundRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/7xW32/jNgx+319B6F7awIn747bD8ta1PVy2tc3aYNhQFFfGomtdZUkn0c15Rf/3QbaT1Ml+HHBFXz+RFL+PpMRHcY4libFQ5sGqjEaeMuvl0FNeGSkScUIh88qxskaMxRn6+wBcEARGrgLYHNBA55zAvIbJSQIYoA1AcgQT0zj8fHVxDp4+VxQY5lbWCSiT6UoSIDisSzIMkhiVBjv/RBkDFxihXBlqL12alcSFlYBGguWCfOcXRiIRv1Xk6yl6LInJBzG+vknEB0JJfhN9b325iU2Rix72KGa1iwoF9srciUT8jl7hXFNfuY8qyvUL1R28pd2sIJicRMUilc4L2EKJ/r4nmUjEkfdYtxfvJeKSUF4YXYtxjjpQBD5XypMUY/YVJWLqrSPPioIYm0rrp5vWhgK3QVYsLptL4KQRbJtMLEyPRgf0qUya5JW563J+rv9XZ94Bz1Nfi31ceU8mq7czxNJWhns5rqB+lj9hoGUr5dYDag25MmgyhRoeUFcEnjQyScgVaRlgZ44aTezkVUdWlABxNtp9MW7/1khZx/nYSurxy9Zi9BkegiZm8rC0gMzGeQrd1MhmIK8u4O3B/rtvLU7TV8n/smh07aW/RPq5t0WDysUROAep7hQD5pFNnA9JmSpRBwjk0CPH+q1pKbOi1ZQ2eqBz3jqvkKmvx4vM01cwl8h94h2w/QzEA1gUZHpPwaL3bK7scutLZFABBnVd14Ph4OxsMBxIOYDBX4NkQ5briWHyhhhOkCmdqZLgfRPhZqdgduM0ZWt1GCnifGT9XVpwqVOfZ4eHhz++CZTFPIffj37YHUVHoC9YOk0J3B7s7b8d7h0MD97B9Gp2+0r9ZOyGqh3QV/UIIgwYgs1UM9ELxUUjbyvpK2XLHk3ARsPND2Hr6L++hynWU9TL5/WZ6wiWaa4Z3k6P/pwe/Xq7Mq8dvRbfeNxj2QLb3DYYxRRhYqTKkCnEYWg+8nXBmnFwqCRw4W11VywjND0Zexy1rmPLq9VvlGu7aCfnut1julg3O6m0WUjRqXRlnb7pBi987C09u8v1IlTOWc/t6nF7+sfs9PJ8U+Xmsn/SP85rFyB+L9bDHLP7BXoJmS0dsporrbh+kTrdPEWr4KwJ1MaJcCKOrWEy3Qog0Dkd5VbWpJ+CNSIRH5jdWcNWjMX04mom2g1IjEX6sP9Mq6VU6eN63XlKN5fF0y+OMiZ51SyHzT82Ptjbe/rubwAAAP//
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Marks the status of an invoice, by ID, as refunded. In the JSON request body, include a payment detail object that defines the payment method and other details.
 **/

class InvoiceRecordRefundRequest {

  constructor(invoiceId) {
    this.path = '/v1/invoicing/invoices/{invoice_id}/record-refund?';
    this.path = this.path.replace('{invoice_id}', querystring.escape(invoiceId));
    this.verb = 'POST';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  requestBody(body) {
    this.body = body;
    return this;
  }
}

module.exports = {InvoiceRecordRefundRequest: InvoiceRecordRefundRequest};
