// One-off: email Keymon about new By Red OS functionality
// Run: node scripts/email-keymon.mjs

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const require = createRequire(import.meta.url)

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;background:#fff">
  <div style="margin-bottom:24px">
    <span style="background:#D7261E;color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:4px;text-transform:uppercase">By Red OS</span>
  </div>

  <p style="font-size:16px;font-weight:700;color:#111;margin:0 0 4px">Hey Keymon,</p>
  <p style="font-size:14px;color:#555;margin:0 0 24px">A few things just shipped in By Red OS that are worth knowing about.</p>

  <div style="border-left:3px solid #D7261E;padding-left:16px;margin-bottom:20px">
    <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 4px">@mention anyone on the team</p>
    <p style="font-size:13px;color:#555;margin:0">Type <strong>@</strong> in any text field — tasks, comments, messages, Lantern AI — and a dropdown of team members appears. Select to tag them directly in context.</p>
  </div>

  <div style="border-left:3px solid #D7261E;padding-left:16px;margin-bottom:20px">
    <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 4px">Notification bell</p>
    <p style="font-size:13px;color:#555;margin:0">When someone tags you, you get an in-app notification in the top bar. No more missing mentions buried in tasks.</p>
  </div>

  <div style="border-left:3px solid #D7261E;padding-left:16px;margin-bottom:20px">
    <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 4px">Email alerts on mentions</p>
    <p style="font-size:13px;color:#555;margin:0">If someone tags you and you're not in the app, you'll get an email so nothing slips through.</p>
  </div>

  <div style="border-left:3px solid #D7261E;padding-left:16px;margin-bottom:24px">
    <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 4px">Lantern AI can send emails for you</p>
    <p style="font-size:13px;color:#555;margin:0">Ask Lantern AI to send an email — it'll draft it, show you a preview, and confirm before sending. Just say something like <em>"email Basheer about the Q2 timeline"</em> and it handles the rest.</p>
  </div>

  <p style="font-size:13px;color:#555;margin:0 0 4px">More rolling out soon. Let me know if anything's off on your end.</p>
  <p style="font-size:13px;color:#111;font-weight:600;margin:0">— Ro</p>

  <p style="margin:32px 0 0;font-size:11px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:16px">Sent via Lantern AI · By Red LLC</p>
</div>
`

const text = `Hey Keymon,

A few things just shipped in By Red OS:

@mention anyone — type @ in any task, comment, message, or Lantern AI chat to tag a team member.

Notification bell — mentions show up in your top bar immediately.

Email alerts — if you're tagged while offline, you'll get an email.

Lantern AI email — ask Lantern AI to send an email and it drafts, previews, and confirms before sending.

More coming. Let me know if anything's off.

— Ro
Sent via Lantern AI · By Red LLC`

try {
  const info = await transporter.sendMail({
    from: `"Ro @ By Red" <${process.env.GMAIL_USER}>`,
    to: 'clashon64@gmail.com',
    subject: 'New in By Red OS — @mentions, notifications, Lantern AI email',
    html,
    text,
  })
  console.log('✅ Sent to Keymon:', info.messageId)
} catch (err) {
  console.error('❌ Failed:', err.message)
}
