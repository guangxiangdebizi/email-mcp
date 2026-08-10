import assert from "node:assert/strict";
import test from "node:test";

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
