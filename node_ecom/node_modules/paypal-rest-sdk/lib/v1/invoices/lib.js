'use strict';
/* eslint-disable comma-dangle*/

module.exports = {
  InvoiceCancelRequest: require('./invoiceCancelRequest').InvoiceCancelRequest,
  InvoiceCreateRequest: require('./invoiceCreateRequest').InvoiceCreateRequest,
  InvoiceDeleteExternalPaymentRequest: require('./invoiceDeleteExternalPaymentRequest').InvoiceDeleteExternalPaymentRequest,
  InvoiceDeleteExternalRefundRequest: require('./invoiceDeleteExternalRefundRequest').InvoiceDeleteExternalRefundRequest,
  InvoiceDeleteRequest: require('./invoiceDeleteRequest').InvoiceDeleteRequest,
  InvoiceGetRequest: require('./invoiceGetRequest').InvoiceGetRequest,
  InvoiceListRequest: require('./invoiceListRequest').InvoiceListRequest,
  InvoiceNextInvoiceNumberRequest: require('./invoiceNextInvoiceNumberRequest').InvoiceNextInvoiceNumberRequest,
  InvoiceQrCodeRequest: require('./invoiceQrCodeRequest').InvoiceQrCodeRequest,
  InvoiceRecordPaymentRequest: require('./invoiceRecordPaymentRequest').InvoiceRecordPaymentRequest,
  InvoiceRecordRefundRequest: require('./invoiceRecordRefundRequest').InvoiceRecordRefundRequest,
  InvoiceRemindRequest: require('./invoiceRemindRequest').InvoiceRemindRequest,
  InvoiceSearchRequest: require('./invoiceSearchRequest').InvoiceSearchRequest,
  InvoiceSendRequest: require('./invoiceSendRequest').InvoiceSendRequest,
  InvoiceUpdateRequest: require('./invoiceUpdateRequest').InvoiceUpdateRequest,
  TemplateCreateRequest: require('./templateCreateRequest').TemplateCreateRequest,
  TemplateDeleteRequest: require('./templateDeleteRequest').TemplateDeleteRequest,
  TemplateGetRequest: require('./templateGetRequest').TemplateGetRequest,
  TemplateListRequest: require('./templateListRequest').TemplateListRequest,
  TemplateUpdateRequest: require('./templateUpdateRequest').TemplateUpdateRequest,
};
