'use strict';
/* eslint-disable comma-dangle*/

module.exports = {
  AvailableEventTypeListRequest: require('./availableEventTypeListRequest').AvailableEventTypeListRequest,
  EventGetRequest: require('./eventGetRequest').EventGetRequest,
  EventListRequest: require('./eventListRequest').EventListRequest,
  EventResendRequest: require('./eventResendRequest').EventResendRequest,
  SimulateEventRequest: require('./simulateEventRequest').SimulateEventRequest,
  WebhookCreateRequest: require('./webhookCreateRequest').WebhookCreateRequest,
  WebhookDeleteRequest: require('./webhookDeleteRequest').WebhookDeleteRequest,
  WebhookGetRequest: require('./webhookGetRequest').WebhookGetRequest,
  WebhookListEventSubscriptionsRequest: require('./webhookListEventSubscriptionsRequest').WebhookListEventSubscriptionsRequest,
  WebhookListRequest: require('./webhookListRequest').WebhookListRequest,
  WebhookUpdateRequest: require('./webhookUpdateRequest').WebhookUpdateRequest,
  WebhookVerifySignatureRequest: require('./webhookVerifySignatureRequest').WebhookVerifySignatureRequest,
};
