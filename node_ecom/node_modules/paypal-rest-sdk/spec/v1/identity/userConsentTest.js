'use strict';

require('../../spec_helper');

const chai = require('chai');
const client = require('../../test_harness').client();
const environment = require('../../test_harness').environment();
const UserConsent = paypal.v1.identity.UserConsent;
const RefreshTokenRequest = paypal.core.RefreshTokenRequest;

describe('UserConsent', function () {
  it('generates consent url correctly', function () {
    console.log(typeof(UserConsent));
    let userConsentUrl = new UserConsent(environment)
                          .responseType('code')
                          .scope('profile+email+openid+phone+address+https%3A%2F%2Furi.paypal.com%2Fservices%2Fpaypalattributes')
                          .redirectUri('http%3A%2F%2Frequestbin.fullcontact.com%2F15a7bhu1')
                          .build();

    chai.assert.equal(userConsentUrl, 'https://www.sandbox.paypal.com/signin/authorize?client_id=AdV4d6nLHabWLyemrw4BKdO9LjcnioNIOgoz7vD611ObbDUL0kJQfzrdhXEBwnH8QmV-7XZjvjRWn0kg&response_type=code&scope=profile+email+openid+phone+address+https%3A%2F%2Furi.paypal.com%2Fservices%2Fpaypalattributes&redirect_uri=http%3A%2F%2Frequestbin.fullcontact.com%2F15a7bhu1');
  });

  it('skips params that are not set', function () {
    let userConsentUrl = new UserConsent(environment).responseType('code').build();

    chai.assert.equal(userConsentUrl, 'https://www.sandbox.paypal.com/signin/authorize?client_id=AdV4d6nLHabWLyemrw4BKdO9LjcnioNIOgoz7vD611ObbDUL0kJQfzrdhXEBwnH8QmV-7XZjvjRWn0kg&response_type=code')
  });

  xit('gets a refresh token from code', function () {
    // This test is an example to demonstrate how to get a refresh token from an authorization code granted by a user, via
    // a link generated in the test above.
    let code = 'C21AAFYom92jXJsUp1PfzFT1vpluuIAprktFUIoUnpZUsf4VAH4bYTnDXKp9aWnZhWHYLZGtk9el4Tn1uNJcbFymHqjOz9xCA';

    let refreshTokenRequest = new RefreshTokenRequest(environment, code);

    return client.execute(refreshTokenRequest)
      .then((resp) => {
        chai.assert.isNotNull(resp.result.token_type);
        chai.assert.isNotNull(resp.result.expires_in);
        chai.assert.isNotNull(resp.result.refresh_token);
        chai.assert.isNotNull(resp.result.id_token);
        chai.assert.isNotNull(resp.result.access_token);
      });
  });
});
