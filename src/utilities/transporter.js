import dotenv from 'dotenv';
dotenv.config({
    path:'./.env'
});
import nodemailer from 'nodemailer';

// console.log("logging");
// console.log(process.env.SMTP_USER);
// console.log(process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export {transporter};