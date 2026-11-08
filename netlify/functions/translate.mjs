// 对读 Duodu — translation endpoint. The DeepSeek key stays on Netlify's server.
// Netlify → Project configuration → Environment variables:
//   DEEPSEEK_API_KEY  (required)  your key from platform.deepseek.com
//   APP_PASSCODE      (recommended) any word; type the same word in the app's settings
//   DEEPSEEK_MODEL    (optional)  defaults to deepseek-chat
//   DEEPSEEK_BASE_URL (optional)  for a relay service, e.g. https://xxx.com/v1 (default: official DeepSeek)
const env = k => (globalThis.Netlify?.env?.get?.(k)) ?? process.env[k];
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "只接受 POST 请求" }, 405);
  const key = env("DEEPSEEK_API_KEY");
  if (!key) return json({ error: "Netlify 里还没有设置 DEEPSEEK_API_KEY" }, 500);
  const pass = env("APP_PASSCODE");
  if (pass && req.headers.get("x-passcode") !== pass) return json({ error: "访问口令不对，请在“阅读设置”里填写" }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: "请求格式不对" }, 400); }
  const { sentences, context = "", from = "English", to = "中文", glossary = "" } = body || {};
  if (!Array.isArray(sentences) || !sentences.length || sentences.length > 40) return json({ error: "每次 1–40 句" }, 400);
  if (sentences.join("").length > 9000) return json({ error: "这一批太长了" }, 400);

  const system = [
    `You are an expert literary translator. Translate from ${from} into ${to}.`,
    "Translate every numbered line faithfully and naturally, the way a published literary translation reads.",
    'Output only lines in the form "N|translation", one line per input line, in the same order, keeping each number.',
    "Do not merge or split lines. Do not add notes or explanations.",
    glossary.trim() ? "Use this glossary consistently:\n" + glossary.trim().slice(0, 3000) : ""
  ].filter(Boolean).join("\n");
  const user = (context ? `Preceding text (for context only, do not translate):\n${context}\n\n` : "") +
    sentences.map((s, i) => `${i + 1}|${String(s).replace(/\s*\n\s*/g, " ")}`).join("\n");

  let r;
  try {
    const base = (env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com").trim().replace(/\/+$/, "");
    const url = /\/chat\/completions$/.test(base) ? base : base + "/chat/completions";
    r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: env("DEEPSEEK_MODEL") || "deepseek-chat", messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 1.3, max_tokens: 6000, stream: false })
    });
  } catch { return json({ error: "服务器连不上翻译接口，检查 DEEPSEEK_BASE_URL 是否正确" }, 502); }

  if (!r.ok) {
    const t = await r.text();
    const msg = r.status === 401 ? "密钥无效，请检查 DEEPSEEK_API_KEY（用中转服务时还要填 DEEPSEEK_BASE_URL）"
      : r.status === 404 ? "接口地址或模型名称不对，检查 DEEPSEEK_BASE_URL 和 DEEPSEEK_MODEL"
      : r.status === 402 ? "账户余额不足，请充值"
      : r.status === 429 ? "请求太频繁，稍等一会再试"
      : `翻译接口返回错误 ${r.status}：${t.slice(0, 160)}`;
    return json({ error: msg }, 502);
  }
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const out = new Array(sentences.length).fill("");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(\d+)\s*[|｜]\s*(.*)$/);
    if (m) { const n = +m[1] - 1; if (n >= 0 && n < out.length) out[n] = m[2].trim(); }
  }
  return json({ translations: out });
};

export const config = { path: "/api/translate" };
