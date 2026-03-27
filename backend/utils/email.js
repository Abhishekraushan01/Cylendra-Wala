const isPlaceholder = (value = "") => {
  const normalized = String(value).trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("your-") ||
    normalized.includes("example.com") ||
    normalized.includes("app-password")
  );
};

const sendResetOtpEmail = async ({ to, name, otp }) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from || isPlaceholder(user) || isPlaceholder(pass) || isPlaceholder(from)) {
    return { deliveryMode: "demo", delivered: false };
  }

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (_error) {
    return { deliveryMode: "demo", delivered: false };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    await transporter.sendMail({
      from,
      to,
      subject: "Cylendra Wala password reset OTP",
      text: `Hello ${name || "there"}, your Cylendra Wala password reset OTP is ${otp}. It expires in 10 minutes.`
    });

    return { deliveryMode: "email", delivered: true };
  } catch (_error) {
    return { deliveryMode: "demo", delivered: false };
  }
};

module.exports = {
  sendResetOtpEmail
};
