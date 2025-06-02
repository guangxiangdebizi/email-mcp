# Email MCP (Model Context Protocol)

基于MCP协议的电子邮件服务，允许AI模型通过简单工具调用发送邮件。

## 功能特点

- 基于标准Model Context Protocol (MCP)协议实现
- 支持VS Code MCP集成，可在VS Code中直接使用
- 提供邮件发送、模板生成等工具
- 支持JWT认证机制
- 支持纯文本和HTML格式的邮件内容
- 支持SuperGateway集成，方便调试

## 快速开始

### 安装与设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/email-mcp.git
cd email-mcp

# 快速设置（包括依赖安装、配置生成和构建）
npm run setup
```

设置过程将引导你创建所需的`.env`配置文件和VS Code MCP配置。

### 运行服务

```bash
# 标准模式
npm run start

# 开发模式
npm run dev

# 通过SuperGateway运行（用于AI模型集成）
npm run start-gateway
```

## MCP工具

Email MCP提供以下工具：

### 1. get_token

获取邮件操作所需的认证令牌。

**参数**:
- `api_key`: API密钥

**返回**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24 hours"
  }
}
```

### 2. verify_token

验证令牌是否有效。

**参数**:
- `token`: JWT令牌

**返回**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "details": {
      "authorized": true,
      "iat": 1616812345,
      "exp": 1616898745
    }
  }
}
```

### 3. send_email

发送电子邮件。

**参数**:
- `to`: 收件人邮箱
- `subject`: 邮件主题
- `text`: 纯文本内容 (可选，如果提供html则可不提供)
- `html`: HTML内容 (可选，如果提供text则可不提供)
- `cc`: 抄送 (可选)
- `bcc`: 密送 (可选)

**返回**:
```json
{
  "success": true,
  "data": {
    "messageId": "<message_id>",
    "timestamp": "2023-05-26T12:34:56.789Z"
  }
}
```

### 4. email_template

生成各种类型的邮件模板。

**参数**:
- `template_type`: 模板类型，可选 "greeting", "notification", "reminder", "newsletter", "custom"
- `title`: 邮件标题
- `content`: 邮件内容
- `recipient_name`: 收件人姓名 (可选)
- `sender_name`: 发件人姓名 (可选)
- `custom_fields`: 自定义字段，用于自定义模板 (可选)

**返回**:
```json
{
  "success": true,
  "data": {
    "html": "<!DOCTYPE html>...",
    "text": "标题\n=====\nDear 收件人,\n...",
    "subject": "邮件标题"
  }
}
```

## VS Code集成

Email MCP可以在VS Code中作为MCP服务器使用，让你的大语言模型可以直接发送邮件。

### 配置方式

1. 打开VS Code
2. 按下`Ctrl+Shift+P`打开命令面板
3. 输入并选择`MCP: List Servers`
4. 选择`EmailMCP`并点击`Start`
5. 在聊天视图中选择`Agent`模式，然后使用`Tools`按钮选择Email MCP提供的工具

### 聊天示例

```
发送一封邮件给recipient@example.com，主题是"会议通知"，内容是"明天下午2点开会，请准时参加"
```

## 在自己的项目中集成

### 通过SuperGateway调用

```javascript
async function sendEmailWithMCP() {
  const response = await fetch('http://localhost:3100/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send_email',
      parameters: {
        to: 'recipient@example.com',
        subject: 'Hello from MCP',
        text: 'This is a test email sent via MCP.'
      }
    })
  });
  
  return await response.json();
}
```

### 通过CLI命令配置VS Code

```bash
code --add-mcp "{\"name\":\"EmailMCP\",\"type\":\"stdio\",\"command\":\"node\",\"args\":[\"path/to/email-mcp/build/index.js\"]}"
```

## 安全注意事项

- 请勿在公共仓库中提交包含敏感信息的.env文件
- 定期轮换API密钥和JWT密钥
- 考虑添加速率限制以防止API滥用
- 监控邮件发送日志以检测异常活动

## 许可证

ISC 