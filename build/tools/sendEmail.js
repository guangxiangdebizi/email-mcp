import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
// 加载环境变量
dotenv.config();
// 环境变量配置
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
// 创建邮件发送器
const createTransporter = () => {
    // 检查邮件凭证是否配置
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in .env file.');
        throw new Error('Email credentials not configured');
    }
    return nodemailer.createTransport({
        service: EMAIL_SERVICE,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
};
// 发送邮件工具定义
export const sendEmail = {
    name: "send_email",
    description: "发送电子邮件到指定的收件人",
    parameters: {
        type: "object",
        properties: {
            to: {
                type: "string",
                description: "收件人邮箱地址"
            },
            subject: {
                type: "string",
                description: "邮件主题"
            },
            text: {
                type: "string",
                description: "邮件纯文本内容（可选，如果提供了html则可不提供）"
            },
            html: {
                type: "string",
                description: "邮件HTML内容（可选，如果提供了text则可不提供）"
            },
            cc: {
                type: "string",
                description: "抄送邮箱地址（可选）"
            },
            bcc: {
                type: "string",
                description: "密送邮箱地址（可选）"
            }
        },
        required: ["to", "subject"]
    },
    // 执行邮件发送
    run: async (params) => {
        try {
            const { to, subject, text, html, cc, bcc } = params;
            // 验证必填字段
            if (!to) {
                return { error: 'Recipient (to) is required' };
            }
            if (!subject) {
                return { error: 'Subject is required' };
            }
            if (!text && !html) {
                return { error: 'Email content (text or html) is required' };
            }
            const transporter = createTransporter();
            // 记录邮件活动以便审计
            console.log(`Sending email to: ${to}, subject: ${subject}`);
            // 发送邮件
            const mailOptions = {
                from: EMAIL_USER,
                to,
                subject,
                text,
                html,
                cc,
                bcc
            };
            const info = await transporter.sendMail(mailOptions);
            // 返回成功信息，带有messageId以便参考
            return {
                success: true,
                data: {
                    messageId: info.messageId,
                    timestamp: new Date().toISOString()
                }
            };
        }
        catch (error) {
            console.error('Error sending email:', error);
            return {
                error: error.message || 'Failed to send email'
            };
        }
    }
};
//# sourceMappingURL=sendEmail.js.map