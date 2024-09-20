import nodemailer from 'nodemailer';

const sendEmail = async function(email, subject, message) {
    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    try {
        await transport.sendMail({
            from: process.env.SMTP_FROM_EMAIL,
            to: email,
            subject: subject,
            html: message,
        });
        console.log(`Email sent to: ${email}`);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Email could not be sent.");
    }
};

export default sendEmail;
