// Deno Deploy 진입점. 정적 페이지와 /api/score 프록시를 함께 처리한다.
import { judge, REQUEST_BODY } from "./shared/questions.js"

const API_KEY = Deno.env.get("JEV_API_KEY")
const page = await Deno.readFile(new URL("./public/index.html", import.meta.url))

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } })

async function score(request) {
  try {
    if (!API_KEY) return json({ error: "JEV_API_KEY 환경변수가 설정되지 않았습니다" }, 500)
    const text = (await request.json()).text
    if (typeof text !== "string" || !text.trim()) return json({ error: "text 값이 비어 있습니다" }, 400)

    const started = Date.now()
    const upstream = await fetch("https://opencode.ai/zen/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(REQUEST_BODY(text)),
    })
    const parsed = await upstream.json()
    if (!upstream.ok) return json({ error: parsed }, upstream.status)
    return json({ ...judge(parsed.answers), usage: parsed.usage, ms: Date.now() - started })
  } catch (err) {
    return json({ error: String(err.message || err) }, 400)
  }
}

Deno.serve((request) => {
  const { pathname } = new URL(request.url)
  if (request.method === "POST" && pathname === "/api/score") return score(request)
  if (request.method === "GET" && (pathname === "/" || pathname === "/index.html"))
    return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  return new Response("Not found", { status: 404 })
})
