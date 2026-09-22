import https from "node:https";
import http from "node:http";
import net from "node:net";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

function lanIps() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === "IPv4" && !i.internal) ips.push(i.address);
    }
  }
  return ips;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(here, ".devcert");
const keyPath = path.join(certDir, "key.pem");
const certPath = path.join(certDir, "cert.pem");
const port = Number(process.env.HTTPS_PORT ?? 3443);
const target = process.env.PROXY_TARGET ?? "127.0.0.1:3000";
const [host, portStr] = target.split(":");
const targetPort = Number(portStr ?? 3000);

async function certExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await certExists(keyPath)) || !(await certExists(certPath))) {
  mkdirSync(certDir, { recursive: true });
  const san = ["DNS:localhost", "IP:127.0.0.1", ...lanIps().map((ip) => `IP:${ip}`)].join(",");
  execSync(
    `openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes ` +
      `-keyout ${keyPath} -out ${certPath} ` +
      `-subj "/CN=translate.local" ` +
      `-addext "subjectAltName=${san}"`,
    { stdio: "ignore" }
  );
  console.log(`[https-test] generated self-signed cert at ${certDir}`);
}

const key = await readFile(keyPath);
const cert = await readFile(certPath);

const server = https.createServer({ key, cert }, (req, res) => {
  const upstream = http.request(
    {
      hostname: host,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${host}:${targetPort}` },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );
  upstream.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`proxy error: ${err.message}`);
  });
  req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(targetPort, host, () => {
    const headers = { ...req.headers, host: `${host}:${targetPort}` };
    const lines = [
      `${req.method} ${req.url} HTTP/1.1`,
      ...Object.entries(headers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`),
      "",
      "",
    ];
    upstream.write(lines.join("\r\n"));
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[https-test] https://0.0.0.0:${port} -> http://${target}`);
  console.log("[https-test] self-signed cert: the browser will show a warning the first time; accept it once.");
  for (const ip of lanIps()) {
    console.log(`[https-test] from another machine open https://${ip}:${port}`);
  }
});
