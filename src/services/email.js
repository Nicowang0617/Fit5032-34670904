const buildCors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',   
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});


export const onRequest = async ({ request, env }) => {
  const origin = request.headers.get('Origin') || '*';

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: buildCors(origin) });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: buildCors(origin),
    });
  }

  try {
    const API_KEY = env.SENDGRID_API_KEY;
    const FROM_EMAIL = env.FROM_EMAIL || 'nicowhy617@gmail.com'; 
    const FROM_NAME  = env.FROM_NAME  || 'Your App';

    if (!API_KEY) {
      return json({ error: 'SENDGRID_API_KEY not set' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, origin);
    }

    const { to, subject, text, html, attachment } = body || {};

    const toList =
      typeof to === 'string' ? [to] :
      Array.isArray(to) ? to :
      null;

    if (!toList || toList.length === 0) {
      return json({ error: '`to` must be a string or string[]' }, 400, origin);
    }
    if (!subject || typeof subject !== 'string') {
      return json({ error: '`subject` is required' }, 400, origin);
    }
    if (!text && !html) {
      return json({ error: 'Either `text` or `html` must be provided' }, 400, origin);
    }

    const msg = {
      personalizations: [
        {
          to: toList.map(e => ({ email: String(e).trim() })),
        }
      ],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        html
          ? { type: 'text/html', value: String(html) }
          : { type: 'text/plain', value: String(text || '') }
      ],
    };

    if (attachment?.content && attachment?.filename) {
      msg.attachments = [
        {
          content: String(attachment.content), 
          filename: String(attachment.filename),
          type: attachment.type || 'application/octet-stream',
          disposition: 'attachment',
        }
      ];
    }

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msg),
    });

    if (sgRes.status !== 202) {
      const detail = await safeText(sgRes);
      return json({ error: detail || `SendGrid error (${sgRes.status})` }, sgRes.status, origin);
    }

    return json({ ok: true }, 200, origin);
  } catch (err) {
    return json({ error: err?.message || String(err) }, 500, origin);
  }
};

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCors(origin),
    },
  });
}

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}
