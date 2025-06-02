import nodemailer from "nodemailer";
import { google } from "googleapis";
// 获取邮件配置
function getEmailConfig() {
    const provider = (process.env.EMAIL_PROVIDER || "smtp");
    if (provider === "gmail") {
        return {
            provider: "gmail",
            gmail: {
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: process.env.GMAIL_ACCESS_TOKEN,
            },
            defaultFrom: process.env.DEFAULT_FROM_EMAIL,
        };
    }
    return {
        provider: "smtp",
        smtp: {
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        },
        defaultFrom: process.env.DEFAULT_FROM_EMAIL,
    };
}
// 通过Gmail API发送邮件
async function sendViaGmail(args, config) {
    const oauth2Client = new google.auth.OAuth2(config.gmail.clientId, config.gmail.clientSecret);
    oauth2Client.setCredentials({
        refresh_token: config.gmail.refreshToken,
        access_token: config.gmail.accessToken,
    });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    // 创建邮件内容
    const emailLines = [
        `To: ${args.to}`,
        `From: ${args.from || config.defaultFrom}`,
        `Subject: ${args.subject}`,
        `Content-Type: ${args.html ? "text/html" : "text/plain"}; charset=utf-8`,
        "",
        args.body,
    ];
    const email = emailLines.join("\n");
    const encodedEmail = Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
    const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw: encodedEmail,
        },
    });
    return {
        success: true,
        messageId: result.data.id,
        provider: "gmail",
    };
}
// 通过SMTP发送邮件
async function sendViaSMTP(args, config) {
    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.auth,
    });
    // 处理附件
    const attachments = [];
    if (args.attachments) {
        for (const attachment of args.attachments) {
            if (attachment.path) {
                // 文件附件
                attachments.push({
                    filename: attachment.filename,
                    path: attachment.path,
                });
            }
            else if (attachment.content) {
                // 内容附件
                attachments.push({
                    filename: attachment.filename,
                    content: attachment.content,
                });
            }
        }
    }
    const mailOptions = {
        from: args.from || config.defaultFrom,
        to: args.to,
        subject: args.subject,
        [args.html ? "html" : "text"]: args.body,
        attachments: attachments.length > 0 ? attachments : undefined,
    };
    const result = await transporter.sendMail(mailOptions);
    return {
        success: true,
        messageId: result.messageId,
        provider: "smtp",
    };
}
// 创建发送邮件工具
export function createSendEmailTool() {
    return async (args) => {
        try {
            const config = getEmailConfig();
            // 验证必需的环境变量
            if (config.provider === "gmail") {
                if (!config.gmail?.clientId || !config.gmail?.clientSecret || !config.gmail?.refreshToken) {
                    throw new Error("Gmail配置缺失。请设置 GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, 和 GMAIL_REFRESH_TOKEN");
                }
            }
            else {
                if (!config.smtp?.auth.user || !config.smtp?.auth.pass) {
                    throw new Error("SMTP配置缺失。请设置 SMTP_USER 和 SMTP_PASS");
                }
            }
            if (!config.defaultFrom) {
                throw new Error("DEFAULT_FROM_EMAIL 环境变量是必需的");
            }
            let result;
            if (config.provider === "gmail") {
                result = await sendViaGmail(args, config);
            }
            else {
                result = await sendViaSMTP(args, config);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ 邮件发送成功！\n\n详情:\n- 收件人: ${args.to}\n- 主题: ${args.subject}\n- 提供商: ${result.provider}\n- 消息ID: ${result.messageId}\n- 格式: ${args.html ? "HTML" : "纯文本"}${args.attachments ? `\n- 附件数量: ${args.attachments.length}` : ""}`,
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "发生未知错误";
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ 邮件发送失败: ${errorMessage}`,
                    },
                ],
            };
        }
    };
}
