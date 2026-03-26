export const SMS_TEMPLATES = {
  invoiceSent: (invoiceNo: string, amount: string, dueDate: string, evcNumber?: string) =>
    `Invoice ${invoiceNo} for ${amount} due ${dueDate}.${evcNumber ? ` Pay via EVC: ${evcNumber}.` : ''} Bayzara`,

  paymentReceived: (amount: string, invoiceNo: string, businessName: string) =>
    `Payment of ${amount} received for ${invoiceNo}. Thank you! - ${businessName} via Bayzara`,

  evcPaymentAlert: (amount: string, senderName: string, senderPhone: string) =>
    `EVC Payment received: $${amount} from ${senderName ?? senderPhone}. Auto-recorded in Bayzara.`,

  invoiceOverdue: (invoiceNo: string, amount: string, businessName: string) =>
    `Reminder: Invoice ${invoiceNo} for ${amount} is overdue. Please contact ${businessName}.`,

  quotationSent: (quotationNo: string, businessName: string) =>
    `${businessName} sent you Quotation ${quotationNo} via Bayzara. Reply ACCEPT or REJECT.`,

  otpCode: (code: string) =>
    `Your Bayzara verification code is: ${code}. Valid for 10 minutes. Do not share.`,
}
