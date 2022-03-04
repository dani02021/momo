'use strict';

const braintreehttp = require('braintreehttp');
const paypal = require('../lib/lib').core;

function client() {
  return new paypal.PayPalHttpClient(environment());
}

function environment() {
  let clientId = process.env.PAYPAL_CLIENT_ID || 'AdV4d6nLHabWLyemrw4BKdO9LjcnioNIOgoz7vD611ObbDUL0kJQfzrdhXEBwnH8QmV-7XZjvjRWn0kg';
  let clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'EPKoPC_haZMTq5uM9WXuzoxUVdgzVqHyD5avCyVC1NCIUJeVaNNUZMnzduYIqrdw-carG9LBAizFGMyK';

  return new paypal.SandboxEnvironment(
    clientId, clientSecret
  );
}

module.exports = {
    client: client,
    environment: environment
};
