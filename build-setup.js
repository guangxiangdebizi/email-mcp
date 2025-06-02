#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('Email MCP 初始化设置\n');

    // 检查.env文件是否存在
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, 'example.env');

    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
        console.log('正在创建 .env 文件...');

        const emailService = await question('邮件服务 (默认: gmail): ') || 'gmail';
        const emailUser = await question('邮箱账户: ');
        const emailPass = await question('邮箱密码/应用专用密码: ');
        const apiKey = await question('API 密钥 (用于安全验证): ') || generateRandomString(32);
        const jwtSecret = await question('JWT 密钥 (用于生成令牌): ') || generateRandomString(32);
        const port = await question('服务器端口 (默认: 3000): ') || '3000';
        const gatewayPort = await question('Gateway 端口 (默认: 3100): ') || '3100';

        const envContent = `# JWT配置
JWT_SECRET=${jwtSecret}

# 邮件配置
EMAIL_SERVICE=${emailService}
EMAIL_USER=${emailUser}
EMAIL_PASS=${emailPass}

# API密钥
API_KEY=${apiKey}

# 端口配置
PORT=${port}
GATEWAY_PORT=${gatewayPort}`;

        fs.writeFileSync(envPath, envContent);
        console.log('✅ .env 文件已创建\n');
    }

    // 创建VSCode MCP配置
    const vscodePath = path.join(__dirname, '.vscode');
    const mcpConfigPath = path.join(vscodePath, 'mcp.json');

    if (!fs.existsSync(vscodePath)) {
        fs.mkdirSync(vscodePath);
    }

    if (!fs.existsSync(mcpConfigPath)) {
        console.log('正在创建 VS Code MCP 配置...');

        const mcpConfig = {
            "inputs": [
                {
                    "type": "promptString",
                    "id": "email-api-key",
                    "description": "Email MCP API Key",
                    "password": true
                }
            ],
            "servers": {
                "EmailMCP": {
                    "type": "stdio",
                    "command": "node",
                    "args": ["${workspaceFolder}/build/index.js"],
                    "env": {
                        "API_KEY": "${input:email-api-key}"
                    },
                    "envFile": "${workspaceFolder}/.env"
                },
                "EmailMCPWithGateway": {
                    "type": "http",
                    "url": "http://localhost:3100"
                }
            }
        };

        fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
        console.log('✅ VS Code MCP 配置已创建\n');
    }

    // 构建项目
    console.log('正在安装依赖...');
    try {
        await execAsync('npm install');
        console.log('✅ 依赖安装完成\n');

        console.log('正在构建项目...');
        await execAsync('npm run build');
        console.log('✅ 项目构建完成\n');

        console.log(`
========================================
🎉 Email MCP 设置完成!

🚀 启动方式:
   - 标准模式: npm run start
   - 开发模式: npm run dev
   - Gateway模式: npm run start-gateway

📚 详细使用方法请查看 README.md
========================================
    `);
    } catch (error) {
        console.error('❌ 设置过程中出错:', error);
    }

    rl.close();
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

main().catch(console.error); 