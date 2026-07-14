import http from "node:http";

const HOST = process.env.KIOSK_PRINT_HOST || "127.0.0.1";
const PORT = Number(process.env.KIOSK_PRINT_PORT || 8787);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function handlePrintJob(job) {
  // This is the point where an ESC/POS library or direct USB/raw socket call
  // should transform the ticket data into printer commands and send them to w80.
  console.log("[kiosk-print-bridge] print job received:");
  console.log(JSON.stringify(job, null, 2));
  return {
    success: true,
    message: "Print job accepted by kiosk bridge scaffold."
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "kiosk-print-bridge",
      host: HOST,
      port: PORT
    });
    return;
  }

  if (req.method === "POST" && req.url === "/print") {
    try {
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      if (!payload || payload.type !== "escpos-print" || payload.format !== "raw") {
        sendJson(res, 400, {
          success: false,
          error: "Invalid kiosk print payload."
        });
        return;
      }

      const result = await handlePrintJob(payload.job || {});
      sendJson(res, 200, result);
      return;
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : "Unknown bridge error."
      });
      return;
    }
  }

  sendJson(res, 404, {
    success: false,
    error: "Not found."
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[kiosk-print-bridge] listening on http://${HOST}:${PORT}`);
});
