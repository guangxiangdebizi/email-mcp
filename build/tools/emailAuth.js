import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
// 加载环境变量
dotenv.config();
// 环境变量配置
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const API_KEY = process.env.API_KEY || 'default_api_key';
// 获取认证令牌工具
export const getToken = {
    name: "get_token",
    description: "获取用于邮件操作的认证令牌",
    parameters: {
        type: "object",
        properties: {
            api_key: {
                type: "string",
                description: "API密钥"
            }
        },
        required: ["api_key"]
    },
    // 执行令牌生成
    run: async (params) => {
        try {
            const { api_key } = params;
            // 验证API密钥
            if (!api_key) {
                return { error: 'API key is required' };
            }
            if (api_key !== API_KEY) {
                return { error: 'Invalid API key' };
            }
            // 创建24小时有效的令牌
            const token = jwt.sign({
                authorized: true,
            }, JWT_SECRET, { expiresIn: '24h' });
            return {
                success: true,
                data: {
                    token,
                    expiresIn: '24 hours'
                }
            };
        }
        catch (error) {
            console.error('Error generating token:', error);
            return {
                error: error.message || 'Failed to generate token'
            };
        }
    }
};
// 验证令牌工具
export const verifyToken = {
    name: "verify_token",
    description: "验证认证令牌是否有效",
    parameters: {
        type: "object",
        properties: {
            token: {
                type: "string",
                description: "要验证的JWT令牌"
            }
        },
        required: ["token"]
    },
    // 执行令牌验证
    run: async (params) => {
        try {
            const { token } = params;
            // 验证令牌参数
            if (!token) {
                return { error: 'Token is required' };
            }
            // 验证令牌
            const decoded = jwt.verify(token, JWT_SECRET);
            return {
                success: true,
                data: {
                    valid: true,
                    details: decoded
                }
            };
        }
        catch (error) {
            console.error('Error verifying token:', error);
            return {
                success: true,
                data: {
                    valid: false,
                    error: error.message
                }
            };
        }
    }
};
//# sourceMappingURL=emailAuth.js.map