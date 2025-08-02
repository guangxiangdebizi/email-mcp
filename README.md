# Email MCP Server

一个基于Model Context Protocol (MCP) 的邮件服务器，让AI可以发送、读取、搜索、删除和回复邮件。支持SMTP和Gmail API两种方式，兼容QQ邮箱、163邮箱、Gmail等常见邮箱服务。

<a href="https://glama.ai/mcp/servers/@guangxiangdebizi/email-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@guangxiangdebizi/email-mcp/badge" alt="Email MCP server" />
</a>

## 🚀 功能特性

- ✉️ **发送邮件** - 支持HTML/纯文本格式，附件功能
- 📥 **读取邮件** - 从收件箱或指定文件夹读取邮件
- 🔍 **搜索邮件** - 按关键词搜索邮件
- 🗑️ **删除邮件** - 删除指定邮件
- ↩️ **回复邮件** - 支持回复和全部回复

## 📦 安装

```bash
npm install
npm run build
```

或者快速安装：
```bash
npm run quick-setup
```

## ⚙️ 配置

1. 复制环境变量模板：
```bash
cp env.example .env
```

2. 编辑 `.env` 文件，选择邮件提供商：

### 选项一：使用QQ邮箱 (推荐)
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-authorization-code
DEFAULT_FROM_EMAIL=your-email@qq.com
```

**QQ邮箱设置步骤：**
1. 登录QQ邮箱 → 设置 → 账户
2. 开启SMTP服务
3. 生成授权码（不是QQ密码）
4. 将授权码填入`SMTP_PASS`

### 选项二：使用163邮箱
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.163.com
SMTP_PORT=994
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-authorization-code
DEFAULT_FROM_EMAIL=your-email@163.com
```

### 选项三：使用Gmail
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

### 选项四：使用Gmail API
```env
EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

## 🔧 使用方法

### 直接启动
```bash
npm run start
```

### 使用SuperGateway调试 (推荐)
```bash
npm run start-gateway
```
服务将在 http://localhost:3200 启动

### 在Cline中配置
```json
{
  "mcpServers": {
    "email-mcp": {
      "url": "http://localhost:3200/sse",
      "type": "sse",
      "disabled": false,
      "autoApprove": [
        "send_email",
        "read_emails", 
        "search_emails",
        "delete_email",
        "reply_email"
      ]
    }
  }
}
```

### 开发模式
```bash
npm run dev
```

## 🛠️ 可用工具

### 1. send_email
发送邮件给指定收件人

**参数：**
- `to` (必需): 收件人邮箱地址
- `subject` (必需): 邮件主题
- `body` (必需): 邮件内容
- `from` (可选): 发件人邮箱地址
- `html` (可选): 是否为HTML格式
- `attachments` (可选): 附件数组

**示例：**
```json
{
  "to": "recipient@qq.com",
  "subject": "来自AI的问候",
  "body": "这是一封由AI助手发送的测试邮件。",
  "html": false
}
```

### 2. read_emails
从收件箱或指定文件夹读取邮件

**参数：**
- `limit` (可选): 邮件数量限制 (默认: 10)
- `folder` (可选): 邮件文件夹 (默认: "INBOX")
- `unreadOnly` (可选): 只读取未读邮件 (默认: false)

### 3. search_emails
搜索邮件

**参数：**
- `query` (必需): 搜索关键词
- `limit` (可选): 结果数量限制 (默认: 10)
- `folder` (可选): 搜索文件夹 (默认: "INBOX")

### 4. delete_email
删除邮件

**参数：**
- `messageId` (必需): 要删除的邮件ID

### 5. reply_email
回复邮件

**参数：**
- `messageId` (必需): 原邮件ID
- `body` (必需): 回复内容
- `replyAll` (可选): 是否回复全部 (默认: false)
- `html` (可选): 是否为HTML格式 (默认: false)

## 🔐 支持的邮箱服务

| 邮箱服务 | SMTP服务器 | 端口 | 安全连接 | 说明 |
|---------|------------|------|----------|------|
| QQ邮箱 | smtp.qq.com | 587 | false | 需要开启SMTP服务并获取授权码 |
| 163邮箱 | smtp.163.com | 994 | true | 需要开启SMTP服务并获取授权码 |
| Gmail | smtp.gmail.com | 587 | false | 需要开启两步验证并生成应用密码 |
| Outlook | smtp-mail.outlook.com | 587 | false | 需要开启SMTP认证 |

## 🐛 故障排除

### 常见问题

1. **QQ邮箱认证失败**
   - 确保已开启SMTP服务
   - 使用授权码而不是QQ密码
   - 检查SMTP设置是否正确

2. **163邮箱认证失败**
   - 确保已开启SMTP服务
   - 使用客户端授权密码
   - 注意端口使用994并开启SSL

3. **Gmail认证失败**
   - 确保启用了"应用密码"
   - 开启两步验证
   - 检查SMTP设置是否正确

4. **Gmail API错误**
   - 确保OAuth令牌有效
   - 检查API配额和权限

5. **TypeScript编译错误**
   - 运行 `npm install` 确保依赖安装完整
   - 检查Node.js版本 (推荐 v18+)

## 🔗 相关链接

- [Model Context Protocol](https://github.com/anthropics/mcp)
- [SuperGateway](https://supergateway.ai)
- [Gmail API文档](https://developers.google.com/gmail/api)
- [QQ邮箱SMTP设置](https://service.mail.qq.com/cgi-bin/help?subtype=1&&id=28&&no=1001256)

## �� 许可证

ISC License