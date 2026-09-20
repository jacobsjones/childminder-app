import { buildInvoiceModel } from './invoiceTemplate.js';

/**
 * Build the invoice email body.
 *
 * Reads the same model as the two PDF renderers (lib/invoiceTemplate.js) so the
 * email and its attachment always quote the same figures, period and sign-off.
 * The markup is deliberately plain and document-like: a white page, serif text,
 * inline styles and table layout, which is what mail clients render reliably.
 *
 * @param {Object} invoiceData - Same shape buildInvoiceModel accepts
 * @returns {Object} - { html, text }
 */
export function buildInvoiceEmail(invoiceData) {
    const model = buildInvoiceModel(invoiceData);

    const addressBlock = model.signOff.addressLines.map(esc).join('<br />');
    const signOffName = model.signOff.providerName
        ? `<br />${esc(model.signOff.providerName)}`
        : '';

    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f1;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e3e3dd;">
          <tr>
            <td style="padding:36px 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.6;color:#1c201d;">

              <p style="margin:0 0 30px;text-align:center;font-size:19px;font-weight:bold;">
                ${esc(model.title)}
              </p>

              <p style="margin:0 0 16px;">Dear ${esc(model.greetingName)},</p>

              <p style="margin:0 0 24px;">
                Please find attached your invoice for ${esc(model.periodName)}.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-top:1px solid #e3e3dd;border-bottom:1px solid #e3e3dd;">
                <tr>
                  <td style="padding:12px 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;color:#1c201d;">
                    ${esc(model.chargeLabel)}
                  </td>
                  <td align="right" style="padding:12px 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;color:#1c201d;">
                    ${esc(model.amountLabel)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;color:#1c201d;">
                    ${esc(model.totalLabel)}
                  </td>
                  <td align="right" style="padding:0 0 12px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;color:#1c201d;">
                    ${esc(model.amountLabel)}
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;">
                The attached invoice sets out my absence policy and my unavailable
                dates. If you have any questions, just reply to this email.
              </p>

              <p style="margin:0 0 20px;">
                ${esc(model.signOff.greeting)}${signOffName}
              </p>

              ${addressBlock ? `<p style="margin:0 0 16px;color:#4a4f4b;font-size:14px;">${addressBlock}</p>` : ''}
              ${model.signOff.registrationLine ? `<p style="margin:0;color:#4a4f4b;font-size:14px;">${esc(model.signOff.registrationLine)}</p>` : ''}

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textLines = [
        model.title,
        '',
        `Dear ${model.greetingName},`,
        '',
        `Please find attached your invoice for ${model.periodName}.`,
        '',
        `${model.chargeLabel}   ${model.amountLabel}`,
        `${model.totalLabel}   ${model.amountLabel}`,
        '',
        'The attached invoice sets out my absence policy and my unavailable dates.',
        'If you have any questions, just reply to this email.',
        '',
        model.signOff.greeting,
        model.signOff.providerName,
        '',
        ...model.signOff.addressLines,
        '',
        model.signOff.registrationLine,
    ];

    return { html, text: textLines.filter(line => line !== undefined).join('\n').trim() };
}

/** Settings are provider-entered free text, so escape before interpolating. */
function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
