import assert from "node:assert/strict";
import https from "node:https";
import test from "node:test";

import testTls from "../node_modules/imapflow/test/fixtures/test-tls.js";
import { createHttpServer } from "../dist/index.js";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function close(server) {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

async function secureRequest(port, path, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers,
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.once("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

test("Streamable HTTP endpoint exposes exactly the original five tools", async () => {
  const server = createHttpServer({
    env: {
      MCP_PATH: "/mcp",
      MCP_API_KEY: "test-key",
      EMAIL_PROVIDER: "smtp",
      SMTP_USER: "reader@163.com",
    },
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  const headers = {
    authorization: "Bearer test-key",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  const rpc = async (body) => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    return response.json();
  };

  try {
    const health = await (await fetch(`${baseUrl}/health`)).json();
    assert.equal(health.transport, "streamable-http");
    assert.equal(health.toolCount, 5);

    const initialize = await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "email-mcp-test", version: "1.0.0" },
      },
    });
    assert.equal(initialize.result.serverInfo.name, "email-mcp-server");

    const listed = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    assert.deepEqual(
      listed.result.tools.map((tool) => tool.name),
      ["send_email", "read_emails", "search_emails", "delete_email", "reply_email"],
    );

    const read = await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "read_emails", arguments: { limit: 1 } },
    });
    assert.equal(read.result.isError, true);
    assert.match(read.result.content[0].text, /IMAP password/i);
    assert.doesNotMatch(read.result.content[0].text, /Gmail configuration missing/i);

    const unauthorized = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list", params: {} }),
    });
    assert.equal(unauthorized.status, 401);

    const getResponse = await fetch(`${baseUrl}/mcp`, { headers: { authorization: "Bearer test-key" } });
    assert.equal(getResponse.status, 405);
  } finally {
    await close(server);
  }
});

test("native HTTPS works without API-key authentication by default", async () => {
  const server = createHttpServer({
    env: {
      MCP_PATH: "/mcp",
    },
    tls: testTls,
  });
  const port = await listen(server);
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "email-mcp-https-test", version: "1.0.0" },
    },
  });

  try {
    const health = await secureRequest(port, "/health");
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).tls, true);
    assert.equal(health.headers["strict-transport-security"], "max-age=31536000");
    assert.equal(health.headers["cache-control"], "no-store");

    const response = await secureRequest(port, "/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "content-length": Buffer.byteLength(body),
        "x-email-smtp-user": "encrypted-header@example.test",
        "x-email-smtp-pass": "encrypted-app-password",
      },
      body,
    });
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(response.body).result.serverInfo.name, "email-mcp-server");
  } finally {
    await close(server);
  }
});
