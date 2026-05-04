import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendMentionEmail({
  toEmail,
  toName,
  actorName,
  snippet,
  contextUrl,
}: {
  toEmail: string
  toName: string
  actorName: string
  snippet: string
  contextUrl?: string | null
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://os.byred.com"
  const link = contextUrl ? `${appUrl}${contextUrl}` : appUrl

  await transporter.sendMail({
    from: `"By Red OS" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${actorName} mentioned you`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <p style="margin:0 0 8px;font-size:14px;color:#111">
          <strong>${actorName}</strong> mentioned you in By Red OS.
        </p>
        <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f5f5f5;border-left:3px solid #D7261E;border-radius:4px;font-size:13px;color:#333">
          ${snippet}
        </blockquote>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background:#D7261E;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">
          View in OS →
        </a>
        <p style="margin:24px 0 0;font-size:11px;color:#999">By Red LLC · You received this because you were mentioned.</p>
      </div>
    `,
  })
}
