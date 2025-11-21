import nodemailer from 'nodemailer'
import { env } from '~/lib/env';

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.EMAIL_FROM,
      pass: env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Lync" <${env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
}
