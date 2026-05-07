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
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #0a0a0a;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;border-bottom:3px solid #1651C8;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:12px;vertical-align:middle;">
                <img src="https://brenn.it/logo.png" alt="Brenn" style="height:28px;width:28px;border-radius:3px;display:block;">
              </td>
              <td style="vertical-align:middle;">
                <span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.12em;text-transform:uppercase;">BRENN CONSULTING</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Eyebrow -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1651C8;">
              &#8212;&nbsp; Richiesta ricevuta
            </p>
            <p style="margin:0 0 24px;font-family:'Arial Narrow',Arial,sans-serif;font-size:36px;font-weight:700;color:#0a0a0a;line-height:1.05;letter-spacing:-0.01em;text-transform:uppercase;">
              Ciao ${nomeCompleto},<br>ci siamo.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e0e0e0;"></div></td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 18px;font-size:15px;font-weight:300;color:#444;line-height:1.7;">
              Abbiamo ricevuto la tua richiesta. Il tuo studio è ora nella nostra lista: lo analizziamo personalmente e ti diciamo onestamente cosa manca — senza giri di parole.
            </p>
            <p style="margin:0 0 28px;font-size:15px;font-weight:300;color:#444;line-height:1.7;">
              Ti ricontattiamo entro <strong style="font-weight:600;color:#0a0a0a;">24 ore lavorative</strong>.
            </p>
            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-left:3px solid #0a0a0a;margin-bottom:28px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:6px;">Cosa succede ora</p>
                <p style="margin:0;font-size:14px;color:#0a0a0a;line-height:1.6;">Cerchiamo il tuo studio su Google, analizziamo la tua presenza online e prepariamo un report personalizzato per te.</p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a;padding:20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><p style="margin:0;font-size:11px;color:#888;letter-spacing:0.08em;">© 2026 BRENN CONSULTING · MILANO</p></td>
              <td align="right"><a href="mailto:info@brenn.it" style="font-size:11px;color:#888;letter-spacing:0.08em;text-decoration:none;">info@brenn.it</a></td>
            </tr></table>
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
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #0a0a0a;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;border-bottom:3px solid #1651C8;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:12px;vertical-align:middle;">
                <img src="https://brenn.it/logo.png" alt="Brenn" style="height:28px;width:28px;border-radius:3px;display:block;">
              </td>
              <td style="vertical-align:middle;">
                <span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.12em;text-transform:uppercase;">BRENN CONSULTING</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Eyebrow -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1651C8;">
              &#8212;&nbsp; Cesare @ Brenn
            </p>
            <p style="margin:0 0 24px;font-family:'Arial Narrow',Arial,sans-serif;font-size:36px;font-weight:700;color:#0a0a0a;line-height:1.05;letter-spacing:-0.01em;text-transform:uppercase;">
              Ho guardato<br>il tuo studio.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e0e0e0;"></div></td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 18px;font-size:15px;font-weight:300;color:#444;line-height:1.7;">
              Ciao ${nomeCompleto}, ti scrivo io direttamente — sono <strong style="font-weight:600;color:#0a0a0a;">Cesare Finocchiaro</strong> di Brenn.
            </p>
            <p style="margin:0 0 18px;font-size:15px;font-weight:300;color:#444;line-height:1.7;">
              Ho analizzato la presenza online del tuo studio e ho qualcosa di concreto da mostrarti: cosa trovano i tuoi potenziali clienti quando cercano ${professione ? `un ${professione.toLowerCase()}` : 'il tuo studio'} su Google, e cosa si può fare subito.
            </p>
            <p style="margin:0 0 28px;font-size:15px;font-weight:300;color:#444;line-height:1.7;">
              Prenota tu stesso il giorno e l'orario — ci bastano <strong style="font-weight:600;color:#0a0a0a;">15 minuti</strong>, senza impegno.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#1651C8;">
                  <a href="${BOOKING_URL}" style="display:inline-block;padding:16px 32px;font-family:'Arial Narrow',Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;">
                    Prenota la verifica gratuita &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-left:3px solid #0a0a0a;margin-bottom:8px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:6px;">In questi 15 minuti</p>
                <p style="margin:0;font-size:14px;color:#0a0a0a;line-height:1.6;">Presenza su Google, reputazione online, sito web esistente. Ti dico esattamente cosa manca e cosa fare — senza vendere nulla.</p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a;padding:20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><p style="margin:0;font-size:11px;color:#888;letter-spacing:0.08em;">© 2026 BRENN CONSULTING · MILANO</p></td>
              <td align="right"><a href="mailto:info@brenn.it" style="font-size:11px;color:#888;letter-spacing:0.08em;text-decoration:none;">info@brenn.it</a></td>
            </tr></table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  let errors = [];

  try {
    await sendEmail({
      from: 'Brenn <info@brenn.it>',
      to: email,
      subject: 'Abbiamo ricevuto la tua richiesta — Brenn',
      html: grazie,
    });
    console.log('Email ringraziamento inviata a', email);
  } catch (e) {
    console.error('Errore email ringraziamento:', e.message);
    errors.push(e.message);
  }

  try {
    await sendEmail({
      from: 'Cesare @ Brenn <info@brenn.it>',
      to: email,
      subject: `${nome}, ho guardato il tuo studio — Brenn`,
      html: prenota,
      scheduled_at: quindiciMin,
    });
    console.log('Email prenotazione programmata per', quindiciMin);
  } catch (e) {
    // Se scheduled_at non è supportato, invia subito
    try {
      await sendEmail({
        from: 'Cesare @ Brenn <info@brenn.it>',
        to: email,
        subject: `${nome}, ho guardato il tuo studio — Brenn`,
        html: prenota,
      });
      console.log('Email prenotazione inviata subito (fallback)');
    } catch (e2) {
      console.error('Errore email prenotazione:', e2.message);
      errors.push(e2.message);
    }
  }

  return { statusCode: 200, body: errors.length ? 'Partial: ' + errors.join('; ') : 'OK' };
};
