// Vercel serverless function: POST /api/waitlist
// Adds (or updates) a Wilde waitlist sign-up directly in Brevo.
//
// Required environment variables (Vercel > Project > Settings > Environment Variables):
//   BREVO_API_KEY       your Brevo API key (Brevo > SMTP & API > API Keys)
//   BREVO_LIST_ID       3   (the "Wilde List")
// Optional, for an email alert on every sign-up (replaces the Formspree WhatsApp alert):
//   NOTIFY_EMAIL        where alerts go, e.g. your team inbox
//   SENDER_EMAIL        a sender address already verified in Brevo

const BREVO = "https://api.brevo.com/v3";
const ROLES = ["writer", "reader", "investor"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "").trim().toLowerCase();
  // First name: optional on the server, tidied up ("  aDA " -> "Ada"), max 50 characters.
  const rawName = String(body.name || "").trim().replace(/\s+/g, " ").slice(0, 50);
  const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "";

  // Honeypot: a hidden field real visitors leave empty; bots fill it in.
  if (body.website) return res.status(200).json({ ok: true });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: "Please choose writer, reader or investor." });
  }

  const headers = {
    "api-key": process.env.BREVO_API_KEY,
    "content-type": "application/json",
    accept: "application/json",
  };

  try {
    // 1. Look up the contact, so someone who picks a second role keeps both
    //    (e.g. "writer+reader") and keeps their original sign-up date.
    let roles = new Set([role]);
    let signupDate = new Date().toISOString().slice(0, 10);
    let isNew = true;

    const existing = await fetch(`${BREVO}/contacts/${encodeURIComponent(email)}`, { headers });
    if (existing.ok) {
      isNew = false;
      const c = await existing.json();
      const a = c.attributes || {};
      String(a.ROLE || "").split("+").filter(Boolean).forEach((r) => roles.add(r));
      if (a.SIGNUP_DATE) signupDate = String(a.SIGNUP_DATE).slice(0, 10);
    }
    const roleValue = ROLES.filter((r) => roles.has(r)).join("+");

    // 2. Create or update the contact and add it to the Wilde List.
    const save = await fetch(`${BREVO}/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        // FIRSTNAME is only sent when given, so an existing name is never wiped out.
        attributes: {
          ROLE: roleValue,
          SIGNUP_DATE: signupDate,
          ...(firstName ? { FIRSTNAME: firstName } : {}),
        },
        listIds: [Number(process.env.BREVO_LIST_ID || 3)],
        updateEnabled: true,
      }),
    });
    if (!save.ok && save.status !== 204) {
      console.error("Brevo error", save.status, await save.text());
      return res.status(502).json({ error: "Something went wrong. Please try again." });
    }

    // 3. Optional: email the team about the new sign-up.
    if (!process.env.NOTIFY_EMAIL || !process.env.SENDER_EMAIL) {
      console.log("Notify skipped: NOTIFY_EMAIL or SENDER_EMAIL is not set");
    } else {
      const notify = await fetch(`${BREVO}/smtp/email`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sender: { name: "Wilde Waitlist", email: process.env.SENDER_EMAIL },
          to: [{ email: process.env.NOTIFY_EMAIL }],
          subject: `New Wilde sign-up: ${email} (${role})`,
          textContent: `${isNew ? "New" : "Returning"} sign-up\nName: ${firstName || "(not given)"}\nEmail: ${email}\nRole now: ${roleValue}\nSigned up: ${signupDate}`,
        }),
      }).catch((e) => { console.error("Notify failed", e); return null; });
      if (notify && !notify.ok) {
        console.error("Notify error", notify.status, await notify.text());
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
