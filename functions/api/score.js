// Cloudflare Pages Function. API 키는 JEV_API_KEY 시크릿에서 읽는다.
import { judge, REQUEST_BODY } from "../../shared/questions.js"

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } })

export async function onRequestPost({ request, env }) {
  try {
    if (!env.JEV_API_KEY) return json({ error: "JEV_API_KEY 시크릿이 설정되지 않았습니다" }, 500)
    const text = (await request.json()).text
    if (typeof text !== "string" || !text.trim()) return json({ error: "text 값이 비어 있습니다" }, 400)

    const started = Date.now()
    const upstream = await fetch("https://opencode.ai/zen/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.JEV_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(REQUEST_BODY(text)),
    })
    const parsed = await upstream.json()
    if (!upstream.ok) return json({ error: parsed }, upstream.status)
    return json({ ...judge(parsed.answers), usage: parsed.usage, ms: Date.now() - started })
  } catch (err) {
    return json({ error: String(err.message || err) }, 400)
  }
}
