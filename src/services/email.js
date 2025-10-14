const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',        
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

export const onRequest = async ({ request, env }) => {
  const origin = request.headers.get('Origin') || '*';

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  try {
    const { to, subject, text, html, attachment } = await request.json();

    if (!env.SENDGRID_API_KEY) {
      return new Response(JSON.stringify({ error: 'SENDGRID_API_KEY not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const msg = {
      personalizations: [
        { to: (Array.isArray(to) ? to : [to]).map(e => ({ email: e })) }
      ],
      from: { email: 'nicowhy617@gmail.com', name: 'Your App' },
      subject,
      content: [
        html
          ? { type: 'text/html', value: html }
          : { type: 'text/plain', value: text || '' }
      ],
    };

    if (attachment?.content && attachment?.filename) {
      msg.attachments = [{
        content: attachment.content,
        filename: attachment.filename,
        type: attachment.type || 'application/octet-stream',
        disposition: 'attachment',
      }];
    }

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msg),
    });

    const sgBody = await sgRes.text();
    if (!sgRes.ok) {
      return new Response(JSON.stringify({ error: sgBody }), {
        status: sgRes.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }
};