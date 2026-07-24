import nodemailer from 'nodemailer';

// If EMAIL_USER / EMAIL_PASS are set (e.g. a Gmail address + App Password),
// this actually sends the code by email. If they're not set — which is the
// default for local dev — it just logs the code to the server console so the
// forgot-password flow is still fully testable without any SMTP setup.
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

export const sendResetPasswordCodeEmail = async ({ to, name, code, expiresInMinutes }) => {
  if (!transporter) {
    console.log('\n📧 EMAIL_USER/EMAIL_PASS not configured — printing verification code instead of sending an email:');
    console.log(`   To: ${to}`);
    console.log(`   Verification code: ${code} (expires in ${expiresInMinutes} minutes)\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: 'Your Online Examination Portal verification code',
    html: `
      <div style="font-family: Segoe UI, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#2563eb;">Reset your password</h2>
        <p>Hi ${name || ''},</p>
        <p>We received a request to reset the password for your Online Examination Portal account. Enter this code to continue:</p>
        <p style="text-align:center; margin: 28px 0;">
          <span style="display:inline-block; padding:14px 28px; background:#f1f5f9; color:#0f172a; border-radius:10px; font-size:28px; font-weight:700; letter-spacing:6px;">
            ${code}
          </span>
        </p>
        <p>This code expires in ${expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });
};
