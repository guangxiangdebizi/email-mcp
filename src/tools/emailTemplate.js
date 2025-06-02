// 邮件模板工具
export const emailTemplate = {
  name: "email_template",
  description: "根据提供的模板类型和参数生成邮件内容",
  parameters: {
    type: "object",
    properties: {
      template_type: {
        type: "string",
        description: "模板类型，可选值：'greeting', 'notification', 'reminder', 'newsletter', 'custom'",
        enum: ["greeting", "notification", "reminder", "newsletter", "custom"]
      },
      title: {
        type: "string",
        description: "邮件标题"
      },
      recipient_name: {
        type: "string",
        description: "收件人姓名"
      },
      content: {
        type: "string",
        description: "邮件主体内容"
      },
      sender_name: {
        type: "string",
        description: "发件人姓名"
      },
      custom_fields: {
        type: "object",
        description: "自定义字段，用于自定义模板"
      }
    },
    required: ["template_type", "title", "content"]
  },
  
  // 执行模板生成
  run: async (params) => {
    try {
      const { template_type, title, recipient_name, content, sender_name, custom_fields } = params;
      
      // 基本验证
      if (!template_type) {
        return { error: 'Template type is required' };
      }
      if (!title) {
        return { error: 'Title is required' };
      }
      if (!content) {
        return { error: 'Content is required' };
      }
      
      let htmlTemplate = '';
      let textTemplate = '';
      
      // 根据模板类型生成内容
      switch (template_type) {
        case 'greeting':
          htmlTemplate = generateGreetingTemplate(title, recipient_name, content, sender_name);
          textTemplate = generateGreetingTextTemplate(title, recipient_name, content, sender_name);
          break;
        case 'notification':
          htmlTemplate = generateNotificationTemplate(title, recipient_name, content, sender_name);
          textTemplate = generateNotificationTextTemplate(title, recipient_name, content, sender_name);
          break;
        case 'reminder':
          htmlTemplate = generateReminderTemplate(title, recipient_name, content, sender_name);
          textTemplate = generateReminderTextTemplate(title, recipient_name, content, sender_name);
          break;
        case 'newsletter':
          htmlTemplate = generateNewsletterTemplate(title, recipient_name, content, sender_name);
          textTemplate = generateNewsletterTextTemplate(title, recipient_name, content, sender_name);
          break;
        case 'custom':
          htmlTemplate = generateCustomTemplate(title, recipient_name, content, sender_name, custom_fields);
          textTemplate = generateCustomTextTemplate(title, recipient_name, content, sender_name, custom_fields);
          break;
        default:
          return { error: 'Invalid template type' };
      }
      
      return {
        success: true,
        data: {
          html: htmlTemplate,
          text: textTemplate,
          subject: title
        }
      };
      
    } catch (error) {
      console.error('Error generating email template:', error);
      return {
        error: error.message || 'Failed to generate email template'
      };
    }
  }
};

// 生成问候模板 HTML
function generateGreetingTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `<h2>Dear ${recipient_name},</h2>` : '<h2>Hello,</h2>';
  const senderSignature = sender_name ? `<p>Best regards,<br>${sender_name}</p>` : '<p>Best regards,</p>';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 15px; border-bottom: 3px solid #4CAF50; }
    .content { padding: 20px 0; }
    .footer { border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${recipientGreeting}
      <p>${content}</p>
      ${senderSignature}
    </div>
    <div class="footer">
      <p>This is an automated email sent by Email MCP.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// 生成问候模板 文本版
function generateGreetingTextTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `Dear ${recipient_name},\n\n` : 'Hello,\n\n';
  const senderSignature = sender_name ? `\nBest regards,\n${sender_name}` : '';
  
  return `${title}\n${'='.repeat(title.length)}\n\n${recipientGreeting}${content}${senderSignature}\n\nThis is an automated email sent by Email MCP.`;
}

// 生成通知模板 HTML
function generateNotificationTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `<h2>Dear ${recipient_name},</h2>` : '<h2>Notification</h2>';
  const senderSignature = sender_name ? `<p>From,<br>${sender_name}</p>` : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #e9f5ff; padding: 15px; border-bottom: 3px solid #007bff; }
    .content { padding: 20px 0; }
    .notification-box { background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; }
    .footer { border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${recipientGreeting}
      <div class="notification-box">
        <p>${content}</p>
      </div>
      ${senderSignature}
    </div>
    <div class="footer">
      <p>This notification was sent by Email MCP.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// 生成通知模板 文本版
function generateNotificationTextTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `Dear ${recipient_name},\n\n` : 'Notification\n\n';
  const senderSignature = sender_name ? `\nFrom,\n${sender_name}` : '';
  
  return `${title}\n${'='.repeat(title.length)}\n\n${recipientGreeting}${content}${senderSignature}\n\nThis notification was sent by Email MCP.`;
}

// 生成提醒模板 HTML
function generateReminderTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `<h2>Dear ${recipient_name},</h2>` : '<h2>Reminder</h2>';
  const senderSignature = sender_name ? `<p>Regards,<br>${sender_name}</p>` : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #fff3cd; padding: 15px; border-bottom: 3px solid #ffc107; }
    .content { padding: 20px 0; }
    .reminder-box { background-color: #f8f9fa; border-left: 4px solid #ffc107; padding: 15px; }
    .footer { border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${recipientGreeting}
      <div class="reminder-box">
        <p>${content}</p>
      </div>
      ${senderSignature}
    </div>
    <div class="footer">
      <p>This reminder was sent by Email MCP.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// 生成提醒模板 文本版
function generateReminderTextTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `Dear ${recipient_name},\n\n` : 'Reminder\n\n';
  const senderSignature = sender_name ? `\nRegards,\n${sender_name}` : '';
  
  return `${title}\n${'='.repeat(title.length)}\n\n${recipientGreeting}${content}${senderSignature}\n\nThis reminder was sent by Email MCP.`;
}

// 生成简报模板 HTML
function generateNewsletterTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `<h2>Dear ${recipient_name},</h2>` : '<h2>Newsletter</h2>';
  const senderSignature = sender_name ? `<p>Editor: ${sender_name}</p>` : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #d1e7dd; padding: 15px; border-bottom: 3px solid #198754; }
    .content { padding: 20px 0; }
    .section { margin-bottom: 20px; }
    .section-title { color: #198754; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .footer { border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${recipientGreeting}
      <div class="section">
        <p>${content}</p>
      </div>
      ${senderSignature}
    </div>
    <div class="footer">
      <p>This newsletter was sent by Email MCP.</p>
      <p>To unsubscribe, please reply with "unsubscribe" in the subject line.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// 生成简报模板 文本版
function generateNewsletterTextTemplate(title, recipient_name, content, sender_name) {
  const recipientGreeting = recipient_name ? `Dear ${recipient_name},\n\n` : 'Newsletter\n\n';
  const senderSignature = sender_name ? `\nEditor: ${sender_name}` : '';
  
  return `${title}\n${'='.repeat(title.length)}\n\n${recipientGreeting}${content}${senderSignature}\n\nThis newsletter was sent by Email MCP.\nTo unsubscribe, please reply with "unsubscribe" in the subject line.`;
}

// 生成自定义模板 HTML
function generateCustomTemplate(title, recipient_name, content, sender_name, custom_fields = {}) {
  const recipientGreeting = recipient_name ? `<h2>Dear ${recipient_name},</h2>` : '<h2>Hello,</h2>';
  const senderSignature = sender_name ? `<p>From,<br>${sender_name}</p>` : '';
  
  // 处理自定义字段
  let customContent = content;
  if (custom_fields) {
    Object.entries(custom_fields).forEach(([key, value]) => {
      customContent = customContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
  }
  
  // 如果有自定义颜色
  const headerColor = custom_fields?.header_color || '#f8f9fa';
  const accentColor = custom_fields?.accent_color || '#6c757d';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${headerColor}; padding: 15px; border-bottom: 3px solid ${accentColor}; }
    .content { padding: 20px 0; }
    .footer { border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${recipientGreeting}
      <p>${customContent}</p>
      ${senderSignature}
    </div>
    <div class="footer">
      <p>This email was sent by Email MCP.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// 生成自定义模板 文本版
function generateCustomTextTemplate(title, recipient_name, content, sender_name, custom_fields = {}) {
  const recipientGreeting = recipient_name ? `Dear ${recipient_name},\n\n` : 'Hello,\n\n';
  const senderSignature = sender_name ? `\nFrom,\n${sender_name}` : '';
  
  // 处理自定义字段
  let customContent = content;
  if (custom_fields) {
    Object.entries(custom_fields).forEach(([key, value]) => {
      customContent = customContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
  }
  
  return `${title}\n${'='.repeat(title.length)}\n\n${recipientGreeting}${customContent}${senderSignature}\n\nThis email was sent by Email MCP.`;
} 