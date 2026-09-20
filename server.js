import http from "node:http"
import https from "node:https"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { judge, REQUEST_BODY } from "./shared/questions.js"

const DIR = path.dirname(fileURLToPath(import.meta.url))
const KEY_FILE = path.join(os.homedir(), "Desktop", "KEY", "Opencode-Zen-API.txt")
const API_KEY = fs.readFileSync(KEY_FILE, "utf8").trim()
const PORT = 8787

function callJev(text) {
  const body = JSON.stringify(REQUEST_BODY(text))
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "opencode.ai",
        path: "/zen/v1/systemone",
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ""
        res.on("data", (c) => (data += c))
        res.on("end", () => resolve({ status: res.statusCode, data }))
      },
    )
    req.on("error", reject)
    req.end(body)
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/score") {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", async () => {
      try {
        const text = JSON.parse(raw).text
        if (typeof text !== "string" || !text.trim()) throw new Error("text 값이 비어 있습니다")
        const started = Date.now()
        const upstream = await callJev(text)
        const parsed = JSON.parse(upstream.data)
        if (upstream.status !== 200) {
          res.writeHead(upstream.status, { "Content-Type": "application/json; charset=utf-8" })
          return res.end(JSON.stringify({ error: parsed }))
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify({ ...judge(parsed.answers), usage: parsed.usage, ms: Date.now() - started }))
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify({ error: String(err.message || err) }))
      }
    })
    return
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    return res.end(fs.readFileSync(path.join(DIR, "public", "index.html")))
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => console.log(`http://localhost:${PORT}`))
