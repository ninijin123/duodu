// 对读 Duodu — AI proxy. The API key stays on Netlify's server.
// Netlify → Project configuration → Environment variables:
//   DEEPSEEK_API_KEY  (required)
//   DEEPSEEK_BASE_URL (optional, e.g. https://api.kwwai.top/v1; default official DeepSeek)
//   DEEPSEEK_MODEL    (optional, default deepseek-chat)
const env = k => (globalThis.Netlify?.env?.get?.(k)) ?? process.env[k];
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "只接受 POST 请求" }, 405);
  if ((req.headers.get("x-sync-code") || "").length < 12) return json({ error: "请求被拒绝" }, 401);
  const key = env("DEEPSEEK_API_KEY");
  if (!key) return json({ error: "Netlify 里还没有设置 DEEPSEEK_API_KEY" }, 500);
  let body; try { body = await req.json(); } catch { return json({ error: "请求格式不对" }, 400); }
  const { messages, max_tokens = 1000, temperature = 1 } = body || {};
  if (!Array.isArray(messages) || !messages.length || JSON.stringify(messages).length > 120000) return json({ error: "内容太长或格式不对" }, 400);
  const base = (env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  const url = /\/chat\/completions$/.test(base) ? base : base + "/chat/completions";
  let r;
  try {
    r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: env("DEEPSEEK_MODEL") || "deepseek-chat", messages, max_tokens: Math.min(+max_tokens || 1000, 8000), temperature: +temperature, stream: false }) });
  } catch { return json({ error: "服务器连不上 AI 接口，稍后再试" }, 502); }
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const msg = r.status === 401 ? "密钥无效，请检查 Netlify 里的 DEEPSEEK_API_KEY"
      : r.status === 402 ? "余额不足，请充值"
      : r.status === 404 ? "接口地址或模型名称不对，检查 DEEPSEEK_BASE_URL 和 DEEPSEEK_MODEL"
      : r.status === 429 ? "请求太频繁，稍等一会再试"
      : `AI 接口返回错误 ${r.status}：${t.slice(0, 160)}`;
    return json({ error: msg }, 502);
  }
  const d = await r.json();
  return json({ content: d?.choices?.[0]?.message?.content || "" });
};

export const config = { path: "/api/llm" };
