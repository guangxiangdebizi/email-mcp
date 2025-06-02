#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// 引入工具
import { sendEmail } from "./tools/sendEmail.js";
import { emailTemplate } from "./tools/emailTemplate.js";
import { getToken, verifyToken } from "./tools/emailAuth.js";

// 创建 MCP server
const server = new Server(
  {
    name: "EmailMCP",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 工具：列出所有工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: getToken.name,
        description: getToken.description,
        inputSchema: getToken.parameters
      },
      {
        name: verifyToken.name,
        description: verifyToken.description,
        inputSchema: verifyToken.parameters
      },
      {
        name: sendEmail.name,
        description: sendEmail.description,
        inputSchema: sendEmail.parameters
      },
      {
        name: emailTemplate.name,
        description: emailTemplate.description,
        inputSchema: emailTemplate.parameters
      }
    ]
  };
});

// 工具：执行工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_token": {
      const api_key = String(request.params.arguments?.api_key);
      return await getToken.run({ api_key });
    }

    case "verify_token": {
      const token = String(request.params.arguments?.token);
      return await verifyToken.run({ token });
    }

    case "send_email": {
      const to = String(request.params.arguments?.to);
      const subject = String(request.params.arguments?.subject);
      const text = request.params.arguments?.text ? String(request.params.arguments.text) : undefined;
      const html = request.params.arguments?.html ? String(request.params.arguments.html) : undefined;
      const cc = request.params.arguments?.cc ? String(request.params.arguments.cc) : undefined;
      const bcc = request.params.arguments?.bcc ? String(request.params.arguments.bcc) : undefined;
      
      return await sendEmail.run({ to, subject, text, html, cc, bcc });
    }

    case "email_template": {
      const template_type = String(request.params.arguments?.template_type);
      const title = String(request.params.arguments?.title);
      const content = String(request.params.arguments?.content);
      const recipient_name = request.params.arguments?.recipient_name ? String(request.params.arguments.recipient_name) : undefined;
      const sender_name = request.params.arguments?.sender_name ? String(request.params.arguments.sender_name) : undefined;
      const custom_fields = request.params.arguments?.custom_fields || undefined;
      
      return await emailTemplate.run({ template_type, title, content, recipient_name, sender_name, custom_fields });
    }

    default:
      throw new Error("Unknown tool");
  }
});

// 添加一个简化的发送邮件功能 (包含身份验证和邮件发送)
server.setRequestHandler("simpleSendEmail", async (request) => {
  try {
    const { api_key, to, subject, text, html, cc, bcc } = request.params;
    
    // 1. 获取令牌
    const tokenResult = await getToken.run({ api_key });
    if (!tokenResult.success) {
      return tokenResult;
    }
    
    // 2. 发送邮件
    return await sendEmail.run({ to, subject, text, html, cc, bcc });
  } catch (error) {
    console.error('Error in simpleSendEmail:', error);
    return {
      error: error.message || 'Failed to send email'
    };
  }
});

// 启动 server
async function main() {
  const transport = new StdioServerTransport();
  
  console.log(`
========================================
🚀 Email MCP 服务已启动!

📧 可用的MCP操作:
   - get_token: 获取认证令牌
   - verify_token: 验证令牌有效性
   - send_email: 发送电子邮件
   - email_template: 生成邮件模板
   - simpleSendEmail: 简化版发送邮件(自动处理认证)

📝 确保已在 .env 文件中配置:
   - EMAIL_USER: 你的邮箱账户
   - EMAIL_PASS: 你的邮箱密码
   - API_KEY: 你的API密钥
   - JWT_SECRET: JWT密钥
========================================
  `);

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 