import http from "node:http";
import { SerialPort } from "serialport";
import { buildThermalReceipt } from "../lib/thermalReceipt.js";

const host = process.env.THERMAL_BRIDGE_HOST || "127.0.0.1";
const port = Number(process.env.THERMAL_BRIDGE_PORT || 18181);
const printerPath = process.env.THERMAL_PRINTER_PORT;
const baudRate = Number(process.env.THERMAL_PRINTER_BAUD_RATE || 115200);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new Error("Print request is too large."));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function printBytes(data) {
  return new Promise((resolve, reject) => {
    if (!printerPath) {
      reject(new Error("THERMAL_PRINTER_PORT is not configured."));
      return;
    }

    const printer = new SerialPort({ path: printerPath, baudRate, autoOpen: false });
    printer.open((openError) => {
      if (openError) {
        reject(openError);
        return;
      }

      printer.write(Buffer.from(data), (writeError) => {
        if (writeError) {
          printer.close(() => reject(writeError));
          return;
        }

        printer.drain((drainError) => {
          printer.close(() => (drainError ? reject(drainError) : resolve()));
        });
      });
    });
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, {
      baudRate,
      configured: Boolean(printerPath),
      printerPort: printerPath || null,
      service: "truepower-thermal-bridge",
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/print") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    const data = buildThermalReceipt(body);
    await printBytes(data);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Could not print receipt." });
  }
});

server.listen(port, host, () => {
  console.log(`TruePower thermal bridge listening at http://${host}:${port}`);
  console.log(`Printer: ${printerPath || "not configured"} @ ${baudRate} baud`);
});
