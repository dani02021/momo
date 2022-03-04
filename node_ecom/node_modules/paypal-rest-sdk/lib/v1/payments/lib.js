'use strict';
/* eslint-disable comma-dangle*/

module.exports = {
  AuthorizationCaptureRequest: require('./authorizationCaptureRequest').AuthorizationCaptureRequest,
  AuthorizationGetRequest: require('./authorizationGetRequest').AuthorizationGetRequest,
  AuthorizationReauthorizeRequest: require('./authorizationReauthorizeRequest').AuthorizationReauthorizeRequest,
  AuthorizationVoidRequest: require('./authorizationVoidRequest').AuthorizationVoidRequest,
  CaptureGetRequest: require('./captureGetRequest').CaptureGetRequest,
  CaptureRefundRequest: require('./captureRefundRequest').CaptureRefundRequest,
  OrderAuthorizeRequest: require('./orderAuthorizeRequest').OrderAuthorizeRequest,
  OrderCaptureRequest: require('./orderCaptureRequest').OrderCaptureRequest,
  OrderGetRequest: require('./orderGetRequest').OrderGetRequest,
  OrderVoidRequest: require('./orderVoidRequest').OrderVoidRequest,
  PaymentCreateRequest: require('./paymentCreateRequest').PaymentCreateRequest,
  PaymentExecuteRequest: require('./paymentExecuteRequest').PaymentExecuteRequest,
  PaymentGetRequest: require('./paymentGetRequest').PaymentGetRequest,
  PaymentListRequest: require('./paymentListRequest').PaymentListRequest,
  PaymentUpdateRequest: require('./paymentUpdateRequest').PaymentUpdateRequest,
  RefundGetRequest: require('./refundGetRequest').RefundGetRequest,
  SaleGetRequest: require('./saleGetRequest').SaleGetRequest,
  SaleRefundRequest: require('./saleRefundRequest').SaleRefundRequest,
};
