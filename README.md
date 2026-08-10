# Email MCP Server

一个基于 MCP **Streamable HTTP** 的通用邮箱服务。固定提供 5 个工具，支持通过标准
IMAP/SMTP 使用 QQ、163、126、Gmail、Outlook、Yahoo、iCloud、企业邮箱和自建邮箱，
同时保留 Gmail API 模式。

## 解决的问题

Issue #1 的根因是旧版本只有 `send_email` 使用 SMTP；读取、搜索、删除和回复全部写死为
Gmail API，因此 163 等邮箱只能发信。当前实现改为：

- `send_email`、`reply_email`：标准 SMTP（或 Gmail API）。
- `read_emails`、`search_emails`、`delete_email`：标准 IMAP（或 Gmail API）。
- 工具总数仍为 **5**，名称保持不变。
- 每个工具都有可选 `account` 参数，可在命名账号之间逐次调用切换。
- 每个 HTTP 请求也可使用 `X-Email-*` Header 切换或覆盖连接配置，无需重启服务。

## 安装与启动

要求 Node.js 18 或更高版本。

从 npm 全局安装：

```bash
npm install -g @xingyuchen/email-mcp
email-mcp-server
```

从源码运行：

```bash
npm install
cp .env.example .env
npm run build
npm start
```

默认地址：

```text
http://localhost:3200/mcp
```

健康检查：

```bash
curl http://localhost:3200/health
```

这是原生 Streamable HTTP MCP，不再需要 SuperGateway，也不是旧的 `/sse` 协议。

## 单邮箱配置

### 163 邮箱

先在 163 邮箱设置中启用 SMTP/IMAP，并使用客户端授权码而不是登录密码：

```env
EMAIL_PROVIDER=imap-smtp
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-authorization-code
IMAP_HOST=imap.163.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=your-email@163.com
IMAP_PASS=your-authorization-code
DEFAULT_FROM_EMAIL=your-email@163.com
```

对于常见邮箱，可只配置账号和授权码，服务器会根据邮箱域名补全主机、端口和 TLS：

```env
EMAIL_PROVIDER=imap-smtp
SMTP_USER=your-email@qq.com
SMTP_PASS=your-authorization-code
DEFAULT_FROM_EMAIL=your-email@qq.com
```

当 `IMAP_USER`/`IMAP_PASS` 未设置时，会复用 SMTP 凭据；反向亦然。企业邮箱或自建邮箱
只需显式填写对应的 `SMTP_*` 和 `IMAP_*` 地址即可。

### Gmail API 兼容模式

```env
EMAIL_PROVIDER=gmail-api
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

也可只传有效的 `GMAIL_ACCESS_TOKEN`。如果使用 Gmail 的标准 IMAP/SMTP，则将
`EMAIL_PROVIDER` 设为 `imap-smtp` 并使用应用专用密码。

## 多邮箱切换（不增加工具）

使用 `EMAIL_ACCOUNTS_JSON` 定义命名账号：

```env
EMAIL_DEFAULT_ACCOUNT=personal
EMAIL_ACCOUNTS_JSON={"personal":{"provider":"imap-smtp","from":"me@qq.com","smtp":{"user":"me@qq.com","pass":"qq-code"},"imap":{"user":"me@qq.com","pass":"qq-code"}},"work":{"provider":"imap-smtp","from":"me@outlook.com","smtp":{"user":"me@outlook.com","pass":"work-code"},"imap":{"user":"me@outlook.com","pass":"work-code"}}}
```

随后直接在原有工具中选择账号：

```json
{
  "account": "work",
  "limit": 10,
  "folder": "INBOX"
}
```

`read_emails` 和 `search_emails` 返回的 `messageId` 是不包含密码的定位符，其中保留了
命名账号和 IMAP 文件夹信息。把它直接传给 `reply_email` 或 `delete_email` 时，通常无需
再次填写 `account`。

## 通过请求头配置或切换邮箱

MCP 客户端可以为 Streamable HTTP 连接设置静态 Header：

```json
{
  "mcpServers": {
    "email": {
      "type": "streamable-http",
      "url": "http://localhost:3200/mcp",
      "headers": {
        "Authorization": "Bearer your-mcp-api-key",
        "X-Email-Account": "work"
      }
    }
  }
}
```

也可以完全通过 Header 提供连接信息：

```json
{
  "X-Email-Provider": "imap-smtp",
  "X-Email-From": "me@example.com",
  "X-Email-SMTP-Host": "smtp.example.com",
  "X-Email-SMTP-Port": "465",
  "X-Email-SMTP-Secure": "true",
  "X-Email-SMTP-User": "me@example.com",
  "X-Email-SMTP-Pass": "app-password",
  "X-Email-IMAP-Host": "imap.example.com",
  "X-Email-IMAP-Port": "993",
  "X-Email-IMAP-Secure": "true",
  "X-Email-IMAP-User": "me@example.com",
  "X-Email-IMAP-Pass": "app-password"
}
```

还支持 `X-Email-Config`，值为完整 JSON，或 `base64:<base64url-json>`。可用字段与
`EMAIL_ACCOUNTS_JSON` 内单个账号相同。

配置优先级从高到低：

1. 单独的 `X-Email-*` 连接 Header。
2. `X-Email-Config`。
3. `account` 参数或 `X-Email-Account` 选中的命名账号。
4. 普通环境变量。

账号选择优先级为：工具 `account` > `X-Email-Account` > `X-Email-Config.account` >
`EMAIL_DEFAULT_ACCOUNT`。

> Header 中可能包含邮箱授权码。跨机器部署时必须使用 HTTPS，并建议设置
> `MCP_API_KEY`；不要在日志中打印请求头。

## 固定的 5 个工具

| 工具 | 用途 | 主要协议 |
| --- | --- | --- |
| `send_email` | 发送纯文本/HTML 邮件及附件 | SMTP / Gmail API |
| `read_emails` | 读取文件夹，可只读未读邮件 | IMAP / Gmail API |
| `search_emails` | 搜索指定文件夹 | IMAP / Gmail API |
| `delete_email` | 删除指定邮件 | IMAP / Gmail API |
| `reply_email` | 回复或回复全部 | IMAP + SMTP / Gmail API |

五个工具均支持可选 `account` 参数。

通用 IMAP 搜索支持普通文本，以及：

```text
from:alice@example.com subject:"quarterly report" since:2026-01-01 before:2026-08-01 is:unread
```

## 服务配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MCP_HOST` | `0.0.0.0` | HTTP 监听地址 |
| `MCP_PORT` | `3200` | HTTP 端口 |
| `MCP_PATH` | `/mcp` | Streamable HTTP 路径 |
| `MCP_API_KEY` | 空 | 可选 Bearer / `X-MCP-API-Key` 认证 |
| `MCP_CORS_ORIGIN` | 空 | 可选 CORS 来源，多个值用逗号分隔 |

## 验证

```bash
npm test
```

共 10 项自动化测试，覆盖配置优先级、163 IMAP 泛化、命名账号切换、请求头覆盖、消息
定位符、搜索语法、标准 IMAP 读/搜/删、SMTP 发/回、Streamable HTTP 初始化和工具数量
不变约束。
