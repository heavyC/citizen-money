import "server-only";
import { Resend } from "resend";

export async function sendDigestEmail(to: string, subject: string, narrative: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping digest email send.");
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "digest@citizenmoney.example",
    to,
    subject,
    text: narrative,
  });
}
