export const onRequestPost = async ({ request, env }) => {
try {
const { to, subject, text, html, attachment } = await request.json()


if (!to || !subject) return new Response(JSON.stringify({ error: 'to & subject required' }), { status: 400 })


const msg = {
personalizations: [{ to: Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }] }],
from: { email: 'no-reply@yourdomain.com', name: 'Your App' },
subject,
content: [ html ? { type: 'text/html', value: html } : { type: 'text/plain', value: text || '' } ],
}


if (attachment?.content && attachment?.filename) {
msg.attachments = [{
content: attachment.content, // base64 string
filename: attachment.filename,
type: attachment.type || 'application/octet-stream',
disposition: 'attachment',
}]
}


const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
method: 'POST',
headers: { 'Authorization': `Bearer ${env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
body: JSON.stringify(msg),
})


if (!res.ok) {
const txt = await res.text()
return new Response(JSON.stringify({ error: txt }), { status: 500 })
}


return new Response(JSON.stringify({ ok: true }), { status: 200 })
} catch (err) {
return new Response(JSON.stringify({ error: err.message }), { status: 500 })
}
}