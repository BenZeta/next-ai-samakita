import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your email address",
    html: `
      <div>
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendContractEmail(email: string, contractUrl: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your Rental Agreement",
    html: `
      <div>
        <h1>Rental Agreement</h1>
        <p>Your rental agreement is ready for review and signature.</p>
        <p>Please click the link below to view and sign your contract:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/contracts/sign?url=${encodeURIComponent(contractUrl)}">View Contract</a>
        <p>This contract will expire in 7 days if not signed.</p>
      </div>
    `,
  });
}
