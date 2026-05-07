const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BOOKING_URL = process.env.BOOKING_URL || 'https://cal.eu/brenn-consulting-hiea8z/15min';

async function sendEmail(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
  return res.json();
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let nome, cognome, email, professione;
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    const payload = JSON.parse(body);
    // Netlify Forms webhook invia i campi dentro payload.data
    const d = payload.data || {};
    nome = d.nome || '';
    cognome = d.cognome || '';
    email = d.email || '';
    professione = d.professione || '';
  } catch (e) {
    console.error('Parse error:', e);
    return { statusCode: 400, body: 'Bad Request' };
  }
  if (!email) return { statusCode: 400, body: 'Missing email' };

  const nomeCompleto = `${nome || ''} ${cognome || ''}`.trim() || 'Cliente';

  // --- Email 1: ringraziamento immediato ---
  const grazie = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:32px 40px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">brenn.</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;font-size:26px;font-weight:700;color:#111111;line-height:1.2;">
              Ciao ${nomeCompleto},<br>abbiamo ricevuto la tua richiesta.
            </p>
            <p style="margin:0 0 20px;font-size:16px;color:#444444;line-height:1.6;">
              Grazie per averci contattato. Il tuo studio è ora nella nostra lista e lo analizzeremo personalmente nelle prossime ore.
            </p>
            <p style="margin:0 0 20px;font-size:16px;color:#444444;line-height:1.6;">
              Cerchiamo il tuo studio su Google, analizziamo quello che trovano i tuoi potenziali clienti, e ti diciamo onestamente cosa manca — senza giri di parole.
            </p>
            <p style="margin:0 0 32px;font-size:16px;color:#444444;line-height:1.6;">
              Ti ricontattiamo entro <strong>24 ore lavorative</strong>.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 32px;">
            <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">
              Per qualsiasi necessità scrivici a <a href="mailto:info@brenn.it" style="color:#111111;">info@brenn.it</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 Brenn · Milano</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // --- Email 2: link prenotazione (programmata +15 min) ---
  const quindiciMin = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const prenota = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:32px 40px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">brenn.</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;font-size:26px;font-weight:700;color:#111111;line-height:1.2;">
              Prenota il tuo slot gratuito.
            </p>
            <p style="margin:0 0 20px;font-size:16px;color:#444444;line-height:1.6;">
              Ciao ${nomeCompleto}, siamo pronti ad approfondire la situazione del tuo studio insieme a te. Abbiamo riservato uno slot di <strong>15 minuti</strong> — senza impegno.
            </p>
            <p style="margin:0 0 32px;font-size:16px;color:#444444;line-height:1.6;">
              Scegli tu giorno e orario più comodi:
            </p>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#111111;border-radius:4px;">
                  <a href="${BOOKING_URL}" style="display:inline-block;padding:16px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                    Prenota la tua verifica gratuita →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
              In questi 15 minuti analizziamo insieme cosa trovano i tuoi potenziali clienti quando cercano ${professione ? `un ${professione.toLowerCase()}` : 'il tuo studio'} su Google, e ti diciamo chiaramente cosa fare.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
            <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">
              Per qualsiasi necessità scrivici a <a href="mailto:info@brenn.it" style="color:#111111;">info@brenn.it</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 Brenn · Milano</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await Promise.all([
      sendEmail({
        from: 'Brenn <info@brenn.it>',
        to: email,
        subject: 'Abbiamo ricevuto la tua richiesta — Brenn',
        html: grazie,
      }),
      sendEmail({
        from: 'Brenn <info@brenn.it>',
        to: email,
        subject: 'Prenota il tuo slot gratuito — Brenn',
        html: prenota,
        scheduled_at: quindiciMin,
      }),
    ]);
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'Email error' };
  }
};
