// This class was generated on Tue, 30 Jan 2018 14:07:43 PST by version 0.1.0-dev+8b6e88-dirty of Braintree SDK Generator
// webhookGetRequest.js
// @version 0.1.0-dev+8b6e88-dirty
// @type request
// @data H4sIAAAAAAAC/7xX32/bNhB+319xYPeQFLKVDWvX+S1osyVYt2SJuz0YRnWWzhZrilTJU1yhyP8+kJQcy15/YUGeDH4kxe+7j3dHfxR/YkViIja0KI1Zj1fEIhGvyOVW1iyNFhNxU5qNg4IYpXKwNBYQuvUJLFq4eDUWifirIdteocWKmKwTk9k8EeeEBdl99Fdjq33sCrkcYB/FtK09NcdW6pVIxN9oJS4UDSm/lYVIxO/UdvAB/WlJcPEKzBK4pJ54kLEpZV4CG3Cl2fQCvZZTa7GNx58k4pqwuNSqFZMlKkceeN9IS4WYsG0oEVfW1GRZkhMT3Sh1N49ryHH8iAc95GqjHUVsq++fyOhQ4OdlXWoCY6Ey9l6UWbyjnL9NQgfsariP/dktaYYwOKBHfu4ttzW5AdMhPiR9qgE9Me9GU/vQM2kIO5wf3TvSLPy+BUFrGtsLHMN0d4oNoFL9dqlz1RRSr0DTpgfReddbQEuARUFFAq6mXC7bcBvQMVnp1nCUPc2OYSNVATnaIhxkqVaYU1iY7ajKoobhl7Kn2d52JR0Hfq6pa2OZio5UArM4d4tS+YB2+PzoyRYaBWjkzxv7xcd7nj7/xmv55XQqdozatXOI79kJZVOhHlnCIgjZWdwnXBDyf29kyKrkixq0/9kl3wGHBaHR8n3TkQO/6pEYOkZuhvmyhQ5ZxikfyW3FfcB4zr+C715xDcOvKK8PHM3XUq9h51i4DIXukK6Sej2Mbo98ug7ZWKlHlhT6JJ2dn07PLk9vIGydH6WFyV2KtUxLZDLoRmEi/baU/GyZ/VT0S0vLgZoOOHQgN1WtiAkY7YoY3ly/DkWownUsYL26HJVK/PKF1HGmIi5NARvJJXApXdCdgNQwe3N9AUxV7bf6jlkhz49K5tpN0pSNUW4siZdjY1dpyZVK7TJ//uznk+MxXIRq3BXP77MEsqMsAdQFZMcZ5CVazH2nD424tjSqrcnJOalXY/CKMq81AxkKOKyphd4Xr9Von7hcIkebALchiBqjHgzdwhusOcCPlOYxpgPrttCheefT6VVvg+1O983tP817JAWW1IB+HB9yn/nwR4I+MX3D+uIVefbLixdPHOV+x+in46Rr+47sLYWWjdqXlPjSDN8PRjcaq4VcNaZxqu1azYLi/XBUoWaZu74Q+W1juCGCWage1x1Dd89us9mMJWoM3NA5udKV78Op3zvqJe0Pxx+8jONHq8CNHRoRx4dGvLl+HcMkHeRGL+Wq6a6Rfz+QBqMhUyZHVRrHWYiu1Lmp/Ispu7q8mWagDculzKOVFTmHqxBfZP9JRtm91UDqWA2k0Q/yXr5LxEujmXT3YBZY16ojkr5z4elxzlz/EZNoIn47m4r4p0FMRHr7Q7pL3aVdG3Lpx/t/CXciEWcfasqZipvQWF+agsTkx5OTu+/+BQAA//8=
// DO NOT EDIT
'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Shows details for a webhook, by ID.
 **/

class WebhookGetRequest {

  constructor(webhookId) {
    this.path = '/v1/notifications/webhooks/{webhook_id}?';
    this.path = this.path.replace('{webhook_id}', querystring.escape(webhookId));
    this.verb = 'GET';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }
}

module.exports = {WebhookGetRequest: WebhookGetRequest};
