// utils/sendEmail.js
import { google } from 'googleapis';

const sendEmail = async (email, subject, message) => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.FRONTEND_URL // Use your actual redirect URI
    );

    // Set the refresh token from your environment variable
    oAuth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN, // Use the refresh token from the .env file
    });

    const accessToken = await oAuth2Client.getAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const emailContent = `
        From: "Your Name" <your-email@gmail.com>
        To: ${email}
        Subject: ${subject}
        Content-Type: text/html; charset="UTF-8"

        ${message}
    `;

    const encodedMessage = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    try {
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });
        console.log(`Email sent to: ${email}`);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Email could not be sent.");
    }
};

export default sendEmail;
