// lib/email/templates.ts
// Email templates for household invitations

export interface InvitationEmailData {
  inviterName: string;
  householdName: string;
  inviteCode: string;
  personalMessage?: string;
  inviteUrl: string; // URL to your app with invite code pre-filled
}

export function generateInvitationEmailHTML(data: InvitationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Household Invitation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .invite-code {
            background: #fff;
            border: 2px dashed #4A90E2;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            font-size: 24px;
            font-weight: bold;
            font-family: monospace;
            letter-spacing: 2px;
            color: #4A90E2;
        }
        .button {
            display: inline-block;
            background: #4A90E2;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .personal-message {
            background: #e3f2fd;
            border-left: 4px solid #4A90E2;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 You're Invited!</h1>
            <p><strong>${
              data.inviterName
            }</strong> has invited you to join the <strong>"${
    data.householdName
  }"</strong> household.</p>
        </div>

        ${
          data.personalMessage
            ? `
        <div class="personal-message">
            <strong>Personal message:</strong><br>
            "${data.personalMessage}"
        </div>
        `
            : ''
        }

        <div style="text-align: center;">
            <p>Click the button below to join, or use the invite code:</p>
            
            <div class="invite-code">
                ${data.inviteCode}
            </div>
            
            <a href="${data.inviteUrl}" class="button">Join Household</a>
        </div>

        <div style="margin-top: 30px;">
            <h3>What happens next?</h3>
            <ul>
                <li>📱 Click the link or enter the code in the app</li>
                <li>🏠 You'll be added to the "${
                  data.householdName
                }" household</li>
                <li>✅ Start sharing chores, expenses, and more!</li>
            </ul>
        </div>

        <div class="footer">
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
  `;
}

export function generateInvitationEmailText(data: InvitationEmailData): string {
  return `
You're Invited to Join a Household!

${data.inviterName} has invited you to join the "${
    data.householdName
  }" household.

${data.personalMessage ? `Personal message: "${data.personalMessage}"` : ''}

Invite Code: ${data.inviteCode}

To join:
1. Visit: ${data.inviteUrl}
2. Or open the app and enter the invite code: ${data.inviteCode}

What happens next?
- You'll be added to the "${data.householdName}" household
- Start sharing chores, expenses, and more!

This invitation will expire in 7 days.
If you didn't expect this invitation, you can safely ignore this email.
  `;
}

// Example integration with email service (using Resend as an example)
export async function sendInvitationEmail(
  recipientEmail: string,
  data: InvitationEmailData
): Promise<void> {
  // This is a placeholder - replace with your actual email service

  // Example with Resend:
  /*
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'noreply@yourapp.com',
    to: recipientEmail,
    subject: `Invitation to join "${data.householdName}" household`,
    html: generateInvitationEmailHTML(data),
    text: generateInvitationEmailText(data),
  });
  */

  // Example with SendGrid:
  /*
  import sgMail from '@sendgrid/mail';
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  const msg = {
    to: recipientEmail,
    from: 'noreply@yourapp.com',
    subject: `Invitation to join "${data.householdName}" household`,
    text: generateInvitationEmailText(data),
    html: generateInvitationEmailHTML(data),
  };

  await sgMail.send(msg);
  */

  console.log('Email would be sent to:', recipientEmail);
  console.log('Email data:', data);
}
