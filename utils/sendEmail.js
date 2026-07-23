import nodemailer from 'nodemailer';

// If EMAIL_USER / EMAIL_PASS are set (e.g. a Gmail address + App Password),
// this actually sends the reset link by email. If they're not set — which is
// the default for local dev — it just logs the link to the server console so
// the forgot-password flow is still fully testable without any SMTP setup.
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

export const sendResetPasswordEmail = async ({ to, name, resetUrl }) => {
  if (!transporter) {
    console.log('\n📧 EMAIL_USER/EMAIL_PASS not configured — printing reset link instead of sending an email:');
    console.log(`   To: ${to}`);
    console.log(`   Reset link: ${resetUrl}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: 'Reset your Online Examination Portal password',
    html: `
      <div style="font-family: Segoe UI, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#2563eb;">Reset your password</h2>
        <p>Hi ${name || ''},</p>
        <p>We received a request to reset the password for your Online Examination Portal account.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });
};
