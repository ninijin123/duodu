// 对读 Duodu — AI proxy. The API key stays on Netlify's server.
// Netlify → Project configuration → Environment variables:
//   DEEPSEEK_API_KEY  (required)
//   DEEPSEEK_BASE_URL (optional, e.g. https://api.kwwai.top/v1; default official DeepSeek)
//   DEEPSEEK_MODEL    (optional, default deepseek-chat)
// Word lookup can use Claude instead (the app sends provider:"claude"). If ANTHROPIC_API_KEY is not set, it falls back to DeepSeek.
//   ANTHROPIC_API_KEY  (optional) key from console.anthropic.com
//   ANTHROPIC_MODEL    (optional, default claude-haiku-5-5)
//   ANTHROPIC_BASE_URL (optional, default https://api.anthropic.com)
const env = k => (globalThis.Netlify?.env?.get?.(k)) ?? process.env[k];
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "只接受 POST 请求" }, 405);
  if ((req.headers.get("x-sync-code") || "").length < 12) return json({ error: "请求被拒绝" }, 401);
  let body; try { body = await req.json(); } catch { return json({ error: "请求格式不对" }, 400); }
  const { messages, max_tokens = 1000, temperature = 1, provider = "" } = body || {};
  if (!Array.isArray(messages) || !messages.length || JSON.stringify(messages).length > 120000) return json({ error: "内容太长或格式不对" }, 400);

  const akey = env("ANTHROPIC_API_KEY");
  if (provider === "claude" && akey) {
    const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
    const msgs = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }));
    if (!msgs.length) return json({ error: "内容格式不对" }, 400);
    const abase = (env("ANTHROPIC_BASE_URL") || "https://api.anthropic.com").trim().replace(/\/+$/, "");
    const aurl = /\/messages$/.test(abase) ? abase : abase + "/v1/messages";
    let ar;
    try {
      ar = await fetch(aurl, { method: "POST", headers: { "content-type": "application/json", "x-api-key": akey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: env("ANTHROPIC_MODEL") || "claude-haiku-5-5", max_tokens: Math.min(+max_tokens || 1000, 8000), temperature: Math.max(0, Math.min(+temperature || 0, 1)), ...(sys ? { system: sys } : {}), messages: msgs }) });
    } catch { return json({ error: "服务器连不上 Claude 接口，稍后再试" }, 502); }
    if (!ar.ok) {
      const t = await ar.text().catch(() => "");
      const msg = ar.status === 401 ? "Claude 密钥无效，请检查 Netlify 里的 ANTHROPIC_API_KEY"
        : ar.status === 402 || /credit|balance/i.test(t) ? "Claude 账户余额不足，请充值"
        : ar.status === 404 ? "Claude 模型名称不对，检查 ANTHROPIC_MODEL"
        : ar.status === 429 ? "请求太频繁，稍等一会再试"
        : `Claude 接口返回错误 ${ar.status}：${t.slice(0, 160)}`;
      return json({ error: msg }, 502);
    }
    const ad = await ar.json();
    return json({ provider: "claude", content: (ad?.content || []).filter(c => c.type === "text").map(c => c.text).join("") });
  }

  const key = env("DEEPSEEK_API_KEY");
  if (!key) return json({ error: "Netlify 里还没有设置 DEEPSEEK_API_KEY" }, 500);
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
  return json({ provider: "deepseek", content: d?.choices?.[0]?.message?.content || "" });
};

export const config = { path: "/api/llm" };
