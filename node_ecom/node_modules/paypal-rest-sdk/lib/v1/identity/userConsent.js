'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Shows user details.<blockquote><strong>Note:</strong> This API is deprecated. Use `v1/oauth2/token/userinfo` instead.</blockquote>
 **/

class UserConsent {

  constructor(environment) {
    this.environment = environment;
    this.url = this.environment.webUrl + '/signin/authorize?client_id=' + this.environment.clientId;
  }

  responseType(responseType) {
    this.url += '&response_type=' + responseType;
    return this;
  }

  scope(scope) {
    this.url += '&scope=' + scope;
    return this;
  }

  redirectUri(redirectUri) {
    this.url += '&redirect_uri=' + redirectUri;
    return this;
  }

  build() {
    return this.url;
  }

}

module.exports = {UserConsent: UserConsent};
