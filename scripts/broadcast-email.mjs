// Run: node scripts/broadcast-email.mjs
// Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env.local
import { readFileSync } from "fs"
import { createTransport } from "nodemailer"

// Load .env.local manually
try {
  const env = readFileSync(".env.local", "utf8")
  for (const line of env.split("\n")) {
    const [key, ...rest] = line.split("=")
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
  }
} catch {}

const { GMAIL_USER, GMAIL_APP_PASSWORD, NEXT_PUBLIC_APP_URL } = process.env
const appUrl = NEXT_PUBLIC_APP_URL ?? "https://os.byred.com"

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error("❌ GMAIL_USER or GMAIL_APP_PASSWORD not set in .env.local")
  process.exit(1)
}

const transporter = createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
})

const recipients = [
  { name: "Basheer",          email: "paradise8733@yahoo.com" },
  { name: "Homira Gitesatani", email: "g.homira@gmail.com" },
  { name: "Keymon Penn",       email: "clashon64@gmail.com" },
  { name: "Rory Semeah",       email: "roryleesemeah@icloud.com" },
]

const subject = "A message from Ro — By Red OS just got smarter 🔴"

function html(name) {
  const first = name.split(" ")[0]
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="margin-bottom:24px">
        <span style="background:#D7261E;color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:4px;text-transform:uppercase">By Red OS</span>
      </div>

      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111">Hey ${first} — love you ❤️</h1>

      <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.6">
        Ro here. Just wanted to say I appreciate every one of you — this team is the engine behind everything we're building.
      </p>

      <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6">
        I also want to let you know about something new in the OS:
      </p>

      <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:20px 24px;margin-bottom:24px">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111">📬 @Mention Notifications</h2>
        <p style="margin:0 0 8px;font-size:14px;color:#444;line-height:1.6">
          You can now <strong>@mention teammates</strong> in Comms messages and task comments. When someone tags you:
        </p>
        <ul style="margin:0 0 8px;padding-left:20px;font-size:14px;color:#444;line-height:1.8">
          <li>A <strong>red bell notification</strong> appears in your OS in real time</li>
          <li>You get an <strong>email like this one</strong> so you never miss it</li>
          <li>Click the notification to jump straight to the message</li>
        </ul>
        <p style="margin:0;font-size:13px;color:#888">Try it — type @Name in any Comms channel or task comment.</p>
      </div>

      <a href="${appUrl}/os/comms" style="display:inline-block;padding:12px 24px;background:#D7261E;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700">
        Open By Red OS →
      </a>

      <p style="margin:32px 0 0;font-size:11px;color:#bbb">By Red LLC · This was sent by Ro via By Red OS</p>
    </div>
  `
}

let sent = 0
for (const r of recipients) {
  try {
    await transporter.sendMail({
      from: `"Ro @ By Red" <${GMAIL_USER}>`,
      to: r.email,
      subject,
      html: html(r.name),
    })
    console.log(`✅ Sent to ${r.name} <${r.email}>`)
    sent++
  } catch (err) {
    console.error(`❌ Failed for ${r.name}: ${err.message}`)
  }
}

console.log(`\nDone — ${sent}/${recipients.length} emails sent.`)
