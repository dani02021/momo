// This class was generated on Tue, 30 Jan 2018 14:07:41 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// ordersCancelRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/2SSTY/TMBCG7/yK0ZytZkGcfKuaoF3xsaFEe0ErOo1nicGxw3iCiKr+d5RkEaVcn3mVzPuMT/iBekaLSRxL3rQUWw5osOTcih/Up4gWdwvOQBGWoIHjBHelAYoOHAdWzqAdr9MNNAlaCgG08xl61i4583cOWUnHDP2YFY4McNjtq21TlQdIAodtXe/vH6rysEGDH0eWqSahnpUlo/38aPCWybFc0zdJ+mtWk3b/sBM20zAXzio+fkWDDySejoEvRXzxDg2+5ekZ/iek6RjuSkhPF610Lj17mvfeitC0/urG4J7J3ccwoX2ikHkGP0Yv7NCqjGywljSwqOeMNo4hnB/XDGddPzLDGeUhxcyXbJeicnyOIQ1D8C3Naxbfcopo8FZ1eL/cAC2W1buqqXA1gxaLny+LtuP2exq1WB9Bcfrj4IwGq18Dt8ru03KzXXKM9tXN6/OL3wAAAP//
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Cancels an order, by ID, and deletes the order. To call this method, the order status must be  `CREATED` or `APPROVED`.
 **/

class OrdersCancelRequest {

  constructor(orderId) {
    this.path = '/v1/checkout/orders/{order_id}?';
    this.path = this.path.replace('{order_id}', querystring.escape(orderId));
    this.verb = 'DELETE';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }
}

module.exports = {OrdersCancelRequest: OrdersCancelRequest};
