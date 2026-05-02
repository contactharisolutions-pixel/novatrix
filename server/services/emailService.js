const nodemailer = require('nodemailer')

/**
 * Nodemailer transporter — uses SMTP env vars.
 * Falls back to Ethereal (dev preview) if no SMTP is configured.
 */
let _transporter = null

async function getTransporter() {
  if (_transporter) return _transporter

  if (process.env.SMTP_HOST) {
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } else {
    // Dev: create Ethereal preview account
    const testAccount = await nodemailer.createTestAccount()
    _transporter = nodemailer.createTransport({
      host:   'smtp.ethereal.email',
      port:   587,
      auth:   { user: testAccount.user, pass: testAccount.pass },
    })
    console.log('[Email] Using Ethereal preview. Set SMTP_* env vars for production.')
  }
  return _transporter
}

const FROM = process.env.EMAIL_FROM || '"Novatrix" <noreply@novatrix.vip>'

// ── Email helpers ──────────────────────────────────────────────

async function send({ to, subject, html }) {
  try {
    const transport = await getTransporter()
    const info = await transport.sendMail({ from: FROM, to, subject, html })
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      if (previewUrl) console.log('[Email Preview]', previewUrl)
    }
  } catch (err) {
    // Never throw — email failures should not break the main flow
    console.error('[Email Error]', err.message)
  }
}

function baseLayout(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Novatrix</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:580px;margin:40px auto;background:#0d1526;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6C3CE1,#00D4FF);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;color:#fff;letter-spacing:-0.5px;">Novatrix</h1>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Trading Platform</p>
    </div>
    <!-- Body -->
    <div style="padding:32px;">${content}</div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;font-size:12px;color:#475569;">
        © ${new Date().getFullYear()} Novatrix · <a href="https://novatrix.vip" style="color:#00D4FF;text-decoration:none;">novatrix.vip</a>
      </p>
      <p style="margin:6px 0 0;font-size:11px;color:#334155;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`
}

function btn(text, url) {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#6C3CE1,#00D4FF);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">${text}</a>`
}

function highlight(value) {
  return `<span style="color:#00D4FF;font-weight:700;">${value}</span>`
}

// ── Notification functions ─────────────────────────────────────

/**
 * Deposit approved — sent to member
 */
async function depositApproved({ to, name, amount }) {
  await send({
    to,
    subject: '✅ Deposit Approved — Novatrix',
    html: baseLayout(`
      <h2 style="margin:0 0 8px;color:#10B981;">Deposit Approved!</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>, your deposit has been verified and credited to your fund wallet.</p>
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#64748b;">Amount Credited</p>
        <p style="margin:8px 0 0;font-size:32px;font-weight:800;color:#10B981;">$${(+amount).toFixed(2)}</p>
      </div>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:14px;">Your fund wallet has been topped up. You can now activate a trading package.</p>
      ${btn('Go to Dashboard', `${process.env.CLIENT_URL || 'https://novatrix.vip'}/dashboard`)}
    `),
  })
}

/**
 * Withdrawal approved — sent to member
 */
async function withdrawalApproved({ to, name, netAmount, txHash, wallet }) {
  await send({
    to,
    subject: '✅ Withdrawal Processed — Novatrix',
    html: baseLayout(`
      <h2 style="margin:0 0 8px;color:#10B981;">Withdrawal Processed!</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>, your withdrawal has been processed and sent to your wallet.</p>
      <div style="background:rgba(108,60,225,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="color:#64748b;font-size:13px;">Net Amount</span>
          <span style="color:#10B981;font-weight:700;font-size:18px;">$${(+netAmount).toFixed(2)}</span>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">
          <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Transaction Hash</p>
          <p style="margin:0;font-size:12px;color:#00D4FF;font-family:monospace;word-break:break-all;">${txHash}</p>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;margin-top:12px;">
          <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Sent To</p>
          <p style="margin:0;font-size:11px;color:#94a3b8;font-family:monospace;word-break:break-all;">${wallet}</p>
        </div>
      </div>
      ${btn('View History', `${process.env.CLIENT_URL || 'https://novatrix.vip'}/dashboard/withdraw/history`)}
    `),
  })
}

/**
 * Withdrawal rejected — sent to member with refund notice
 */
async function withdrawalRejected({ to, name, amount, reason }) {
  await send({
    to,
    subject: '❌ Withdrawal Rejected — Novatrix',
    html: baseLayout(`
      <h2 style="margin:0 0 8px;color:#EF4444;">Withdrawal Rejected</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>, unfortunately your withdrawal request of ${highlight('$' + (+amount).toFixed(2))} was rejected.</p>
      <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Reason</p>
        <p style="margin:0;color:#e2e8f0;font-size:14px;">${reason || 'Please contact support for details.'}</p>
      </div>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:14px;">The amount of ${highlight('$' + (+amount).toFixed(2))} has been refunded to your income wallet. You may submit a new request.</p>
      ${btn('Contact Support', `${process.env.CLIENT_URL || 'https://novatrix.vip'}/dashboard/tickets`)}
    `),
  })
}

/**
 * Bonus credited — sent to member
 */
async function bonusCredited({ to, name, amount, type, level }) {
  const label = type === 'direct' ? 'Direct Referral Bonus' : type === 'level' ? `Level ${level} Network Bonus` : 'Trading ROI'
  await send({
    to,
    subject: `💰 ${label} Credited — Novatrix`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px;color:#6C3CE1;">${label} Received!</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>, a bonus has been credited to your income wallet.</p>
      <div style="background:rgba(108,60,225,0.1);border:1px solid rgba(108,60,225,0.25);border-radius:12px;padding:20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#64748b;">Amount Credited</p>
        <p style="margin:8px 0 0;font-size:32px;font-weight:800;color:#00D4FF;">+$${(+amount).toFixed(2)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">${label}</p>
      </div>
      ${btn('View Earnings', `${process.env.CLIENT_URL || 'https://novatrix.vip'}/dashboard/earnings`)}
    `),
  })
}

/**
 * KYC status update — approved or rejected
 */
async function kycStatusUpdate({ to, name, status, note }) {
  const approved = status === 'approved'
  await send({
    to,
    subject: `${approved ? '✅' : '❌'} KYC ${approved ? 'Approved' : 'Rejected'} — Novatrix`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px;color:${approved ? '#10B981' : '#EF4444'};">KYC ${approved ? 'Verification Approved' : 'Verification Rejected'}</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>,</p>
      ${approved
        ? `<p style="color:#94a3b8;">Your identity has been <strong style="color:#10B981;">verified successfully</strong>. You now have full access to all platform features including high-value withdrawals.</p>`
        : `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Reason for Rejection</p>
            <p style="margin:0;color:#e2e8f0;">${note || 'Please resubmit with clearer, valid documents.'}</p>
           </div>
           <p style="color:#94a3b8;font-size:14px;">Please resubmit your documents addressing the issue above.</p>`
      }
      ${btn(approved ? 'Go to Dashboard' : 'Resubmit KYC', `${process.env.CLIENT_URL || 'https://novatrix.vip'}/dashboard/${approved ? '' : 'kyc'}`)}
    `),
  })
}

module.exports = { depositApproved, withdrawalApproved, withdrawalRejected, bonusCredited, kycStatusUpdate }
