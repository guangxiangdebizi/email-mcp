import { readFileSync } from "node:fs";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
export function envBoolean(env, name, defaultValue = false) {
    const raw = env[name]?.trim().toLowerCase();
    if (!raw)
        return defaultValue;
    if (["1", "true", "yes", "on"].includes(raw))
        return true;
    if (["0", "false", "no", "off"].includes(raw))
        return false;
    throw new Error(`${name} must be true or false`);
}
export function isLoopbackHost(host) {
    const normalized = host.trim().toLowerCase();
    return LOOPBACK_HOSTS.has(normalized) || normalized.startsWith("127.");
}
export function loadTlsServerOptions(env) {
    const keyPath = env.MCP_TLS_KEY_PATH?.trim();
    const certPath = env.MCP_TLS_CERT_PATH?.trim();
    if (!keyPath && !certPath)
        return undefined;
    if (!keyPath || !certPath) {
        throw new Error("MCP_TLS_KEY_PATH and MCP_TLS_CERT_PATH must be configured together");
    }
    const caPath = env.MCP_TLS_CA_PATH?.trim();
    const requireClientCertificate = envBoolean(env, "MCP_TLS_REQUIRE_CLIENT_CERT");
    if (requireClientCertificate && !caPath) {
        throw new Error("MCP_TLS_CA_PATH is required when MCP_TLS_REQUIRE_CLIENT_CERT=true");
    }
    const minVersion = env.MCP_TLS_MIN_VERSION?.trim() || "TLSv1.2";
    if (minVersion !== "TLSv1.2" && minVersion !== "TLSv1.3") {
        throw new Error("MCP_TLS_MIN_VERSION must be TLSv1.2 or TLSv1.3");
    }
    return {
        key: readFileSync(keyPath),
        cert: readFileSync(certPath),
        ...(caPath ? { ca: readFileSync(caPath) } : {}),
        ...(env.MCP_TLS_KEY_PASSPHRASE ? { passphrase: env.MCP_TLS_KEY_PASSPHRASE } : {}),
        minVersion,
        requestCert: requireClientCertificate,
        rejectUnauthorized: requireClientCertificate,
        honorCipherOrder: true,
    };
}
export function assertSecureDeployment(env, host, tlsEnabled) {
    const loopback = isLoopbackHost(host);
    if (!tlsEnabled && !loopback && !envBoolean(env, "MCP_ALLOW_INSECURE_HTTP")) {
        throw new Error("Refusing to expose MCP over plaintext HTTP on a non-loopback address. Configure MCP_TLS_KEY_PATH and MCP_TLS_CERT_PATH, bind MCP_HOST to 127.0.0.1 behind a TLS proxy, or explicitly set MCP_ALLOW_INSECURE_HTTP=true");
    }
    const apiKey = env.MCP_API_KEY;
    if (!loopback &&
        apiKey &&
        Buffer.byteLength(apiKey, "utf8") < 32 &&
        !envBoolean(env, "MCP_ALLOW_WEAK_API_KEY")) {
        throw new Error("MCP_API_KEY must contain at least 32 bytes for a network deployment. Set MCP_ALLOW_WEAK_API_KEY=true only for temporary compatibility");
    }
}
export function requestUsesTls(req, env) {
    if (req.socket.encrypted)
        return true;
    if (!envBoolean(env, "MCP_TRUST_PROXY"))
        return false;
    const forwardedProto = req.headers["x-forwarded-proto"];
    const value = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
    return value?.split(",", 1)[0]?.trim().toLowerCase() === "https";
}
export function applySecurityHeaders(req, res, env) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    if (requestUsesTls(req, env)) {
        res.setHeader("Strict-Transport-Security", "max-age=31536000");
    }
}
