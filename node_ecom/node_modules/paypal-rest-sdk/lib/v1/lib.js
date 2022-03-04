'use strict';
/* eslint-disable comma-dangle*/

module.exports = {
  billingAgreements: require('./billingAgreements/lib'),
  billingPlans: require('./billingPlans/lib'),
  identity: require('./identity/lib'),
  invoices: require('./invoices/lib'),
  orders: require('./orders/lib'),
  paymentExperience: require('./paymentExperience/lib'),
  payments: require('./payments/lib'),
  sync: require('./sync/lib'),
  vault: require('./vault/lib'),
  webhooks: require('./webhooks/lib'),
};
