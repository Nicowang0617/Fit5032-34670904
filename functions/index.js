const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

try { admin.app(); } catch (_) { admin.initializeApp(); }
const db = admin.firestore();

setGlobalOptions({
  region: 'australia-southeast1',
  secrets: ['SENDGRID_API_KEY', 'FROM_EMAIL'],
});

const corsHeaders = (req) => {
  const origin = req.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
};

const toTitleCase = (s = '') =>
  String(s)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

exports.email = onRequest(
  { region: 'us-central1', timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.set(corsHeaders(req)).status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.set(corsHeaders(req)).status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { to, subject, text, html, attachment } = req.body || {};
      if (!to || !subject) {
        res.set(corsHeaders(req)).status(400).json({ error: 'Missing "to" or "subject"' });
        return;
      }

      const apiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.FROM_EMAIL;
      if (!apiKey || !fromEmail) {
        res.set(corsHeaders(req)).status(500).json({ error: 'Secrets not set: SENDGRID_API_KEY / FROM_EMAIL' });
        return;
      }

      const msg = {
        personalizations: [
          { to: (Array.isArray(to) ? to : [to]).map((e) => ({ email: e })) },
        ],
        from: { email: fromEmail, name: 'Your App' },
        subject,
        content: [
          html
            ? { type: 'text/html', value: String(html) }
            : { type: 'text/plain', value: String(text || '') },
        ],
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@yourdomain.com>, <https://yourdomain.com/unsubscribe>',
        },
      };

      if (attachment?.content && attachment?.filename) {
        msg.attachments = [{
          content: attachment.content,
          filename: attachment.filename,
          type: attachment.type || 'application/octet-stream',
          disposition: 'attachment',
        }];
      }

      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(msg),
      });

      const bodyText = await r.text();
      if (!r.ok) {
        console.error('SendGrid error:', r.status, bodyText);
        res.set(corsHeaders(req)).status(r.status).json({ error: bodyText || 'SendGrid failed' });
        return;
      }

      res.set(corsHeaders(req)).status(200).json({ ok: true });
    } catch (err) {
      console.error('email error:', err);
      res.set(corsHeaders(req)).status(500).json({ error: err?.message || String(err) });
    }
  }
);

exports.bulkEmail = onRequest(
  { region: 'us-central1', timeoutSeconds: 540 }, 
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.set(corsHeaders(req)).status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.set(corsHeaders(req)).status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const {
        from,
        subject,
        html,
        templateId,
        recipients,
        category = 'bulk',
        attachments = [],
      } = req.body || {};

      if (!Array.isArray(recipients) || recipients.length === 0) {
        res.set(corsHeaders(req)).status(400).json({ error: 'Missing recipients[]' });
        return;
      }

      const apiKey = process.env.SENDGRID_API_KEY;
      const defaultFrom = process.env.FROM_EMAIL;
      if (!apiKey || !defaultFrom) {
        res.set(corsHeaders(req)).status(500).json({ error: 'Secrets not set: SENDGRID_API_KEY / FROM_EMAIL' });
        return;
      }

      const fromObj = { email: from?.email || defaultFrom, name: from?.name || 'Your App' };

      const batches = chunk(recipients, 500);
      const results = [];

      for (const [i, batch] of batches.entries()) {
        const personalizations = batch.map((r) => ({
          to: [{ email: r.email, name: r.name || '' }],
          dynamic_template_data: r.vars || {},
        }));

        const msg = {
          from: fromObj,
          personalizations,
          categories: [category],
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@yourdomain.com>, <https://yourdomain.com/unsubscribe>',
          },
          ...(templateId ? { template_id: templateId } : {}),
          ...(templateId
            ? {}
            : {
                subject: subject || '(no subject)',
                content: [
                  html
                    ? { type: 'text/html', value: String(html) }
                    : { type: 'text/plain', value: '' },
                ],
              }),
        };

        if (attachments?.length) {
          msg.attachments = attachments.map((a) => ({
            content: a.content,
            filename: a.filename,
            type: a.type || 'application/octet-stream',
            disposition: 'attachment',
          }));
        }

        const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(msg),
        });

        const bodyText = await r.text();
        if (!r.ok) {
          console.error(`SendGrid batch #${i + 1} error:`, r.status, bodyText);
          results.push({ ok: false, count: batch.length, status: r.status, error: bodyText || 'SendGrid failed' });
        } else {
          results.push({ ok: true, count: batch.length, status: r.status });
        }
      }

      await db.collection('bulkEmailLogs').add({
        ts: admin.firestore.FieldValue.serverTimestamp(),
        date: isoDate(),
        from: fromObj,
        usedTemplate: !!templateId,
        subject: subject || null,
        total: recipients.length,
        batches: results.length,
        results,
      });

      res.set(corsHeaders(req)).status(200).json({
        total: recipients.length,
        batches: results.length,
        results,
      });
    } catch (err) {
      console.error('bulkEmail error:', err);
      res.set(corsHeaders(req)).status(500).json({ error: err?.message || String(err) });
    }
  }
);

exports.onAppointmentCreate = onDocumentCreated(
  { document: 'appointments/{docId}' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const docId = event.params.docId;
    const ref = db.collection('appointments').doc(docId);

    if (data && data._handledByTrigger) return;

    const normalizedFullName = toTitleCase(data.fullName || '');

    const y = Number(data.year) || 1970;
    const m = Math.max(1, Math.min(12, Number(data.month) || 1));
    const d = Math.max(1, Math.min(31, Number(data.day) || 1));
    const date = new Date(y, m - 1, d, 9, 0, 0);
    const startAt = admin.firestore.Timestamp.fromDate(date);

    await ref.set(
      {
        normalizedFullName,
        startAt,
        _handledByTrigger: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);

exports.checkUserRole = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign-in required');
  }

  let role = 'user';
  const prof = await db.collection('profiles').doc(uid).get();
  if (prof.exists && prof.data()?.role) {
    role = String(prof.data().role);
  } else {
    const user = await admin.auth().getUser(uid);
    if (user.customClaims?.admin === true) role = 'admin';
  }

  return { uid, role, isAdmin: role === 'admin' };
});
