import 'server-only';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendPasswordResetEmail(params: {
  to: string;
  userName: string;
  resetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn('[EMAIL] RESEND_API_KEY is not configured.');
    return { ok: false, error: 'Email service is not configured.' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Nadi <onboarding@resend.dev>';

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject: 'Reset your Nadi clinic password',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf8f3; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid rgba(13,13,12,0.1); border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; background: #ea580c; color: #ffffff; font-weight: bold; font-size: 18px; padding: 6px 14px; border-radius: 8px;">Nadi</span>
    </div>
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 12px;">Reset your password</h2>
    <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 20px;">
      Hello ${escapeHtml(params.userName)}, we received a request to reset the password for your Nadi clinic account.
    </p>
    <div style="margin: 28px 0;">
      <a href="${params.resetUrl}" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
        Reset password &rarr;
      </a>
    </div>
    <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0 0 16px;">
      This link is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 11px; color: #9ca3af; margin: 0;">
      Button not working? Copy and paste this link in your browser:<br/>
      <a href="${params.resetUrl}" style="color: #ea580c; word-break: break-all;">${params.resetUrl}</a>
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[RESEND_ERROR]', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error('[EMAIL_EXCEPTION]', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
