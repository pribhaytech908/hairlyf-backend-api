import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} html - email body (supports HTML)
 */
export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: `"Ecommerce App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error('Failed to send email');
  }
};
