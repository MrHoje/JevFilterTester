// Vercel Function. 키는 JEV_API_KEY 환경변수에서 읽는다.
import { judge, REQUEST_BODY } from "../shared/questions.js"

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  try {
    if (req.method !== "POST") return res.status(405).end(JSON.stringify({ error: "POST만 지원합니다" }))
    if (!process.env.JEV_API_KEY) return res.status(500).end(JSON.stringify({ error: "JEV_API_KEY 환경변수가 설정되지 않았습니다" }))

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const text = body?.text
    if (typeof text !== "string" || !text.trim()) return res.status(400).end(JSON.stringify({ error: "text 값이 비어 있습니다" }))

    const started = Date.now()
    const upstream = await fetch("https://opencode.ai/zen/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.JEV_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(REQUEST_BODY(text)),
    })
    const parsed = await upstream.json()
    if (!upstream.ok) return res.status(upstream.status).end(JSON.stringify({ error: parsed }))
    res.status(200).end(JSON.stringify({ ...judge(parsed.answers), usage: parsed.usage, ms: Date.now() - started }))
  } catch (err) {
    res.status(400).end(JSON.stringify({ error: String(err.message || err) }))
  }
}
