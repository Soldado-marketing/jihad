/**
 * What POST /invoices/:id/send reports.
 *
 * The API sends one message per recipient, so some recipients can receive the
 * invoice while others do not. acceptedCount / failedCount are optional only so
 * an older API response still reads as before.
 */
export type InvoiceSendResponse = {
  recipientCount: number;
  acceptedCount?: number;
  failedCount?: number;
};

export type InvoiceSendMessage = {
  tone: 'success' | 'warning';
  text: string;
};

/**
 * Turns the send result into the notice shown to the owner.
 *
 * A partial send is a warning, never a success: the owner must see that some
 * recipients did not get the invoice.
 */
export function describeInvoiceSend(result: InvoiceSendResponse): InvoiceSendMessage {
  const total = result.recipientCount;
  const accepted = result.acceptedCount ?? total;
  const failed = result.failedCount ?? Math.max(0, total - accepted);

  if (failed > 0) {
    return {
      tone: 'warning',
      text:
        `Partially sent: ${accepted} of ${total} recipient(s) received the invoice; ` +
        `${failed} could not be sent. Check the recipient addresses. ` +
        'Sending again emails every recipient again.',
    };
  }

  return { tone: 'success', text: `Invoice sent to ${accepted} recipient(s).` };
}
