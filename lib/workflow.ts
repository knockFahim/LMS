import { Client as Qstash, resend } from "@upstash/qstash";
import { Client as WorkflowClient } from "@upstash/workflow";

import config from "./config";

export const workflowClient = new WorkflowClient({
  baseUrl: config.env.upstash.qstashUrl,
  token: config.env.upstash.qstashToken!,
});

export const qstashClient = new Qstash({
  token: config.env.upstash.qstashToken!,
});

/**
 * Creates an HTML email template with consistent branding
 */
const createEmailTemplate = (subject: string, content: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #1c1f40;
            padding: 20px;
            text-align: center;
            color: white;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background: #fff;
            padding: 20px;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 5px 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
          .button {
            background-color: #1c1f40;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Brac University Library</h1>
        </div>
        <div class="content">
          <h2>${subject}</h2>
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Brac University Library. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
};

export const sendEmail = async ({
  email,
  subject,
  message,
  plainText = true,
}: {
  email: string;
  subject: string;
  message: string;
  plainText?: boolean;
}) => {
  const htmlContent = plainText
    ? createEmailTemplate(subject, `<p>${message.replace(/\n/g, "<br>")}</p>`)
    : message;

  await qstashClient.publishJSON({
    api: {
      name: "email",
      provider: resend({ token: config.env.resendToken! }),
    },
    body: {
      from: "Brac University <contact@hello.fahimbuilds.me>",
      to: [email],
      subject,
      html: htmlContent,
    },
  });
};
