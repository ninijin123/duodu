// 对读 Duodu — multi-device sync. Data lives in Netlify Blobs, separated by a hash of the sync code.
import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
async function ns(code) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("duodu:" + code));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

export default async (req) => {
  const code = (req.headers.get("x-sync-code") || "").trim();
  if (code.length < 12) return json({ error: "同步码不对" }, 401);
  const required = (globalThis.Netlify?.env?.get?.("SYNC_ALLOWED_CODES") ?? process.env.SYNC_ALLOWED_CODES ?? "").trim();
  if (required && !required.split(/[\s,]+/).includes(code)) return json({ error: "这个同步码没有被允许" }, 403);

  const store = getStore({ name: "duodu", consistency: "strong" });
  const n = await ns(code);
  const url = new URL(req.url);
  const book = url.searchParams.get("book");
  if (book && !/^[\w-]{1,60}$/.test(book)) return json({ error: "书的编号不对" }, 400);
  const idxKey = `${n}/index`;

  try {
    if (req.method === "GET" && !book) {
      const [meta, index] = await Promise.all([store.get(`${n}/meta`, { type: "json" }), store.get(idxKey, { type: "json" })]);
      return json({ meta: meta || null, books: index || {} });
    }
    if (req.method === "GET" && book) {
      const text = await store.get(`${n}/book/${book}`);
      if (text == null) return json({ error: "云端没有这本书" }, 404);
      return new Response(text, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
    }
    if (req.method === "PUT" && !book) {
      const text = await req.text();
      JSON.parse(text);
      await store.set(`${n}/meta`, text);
      return json({ ok: true });
    }
    if (req.method === "PUT" && book) {
      const text = await req.text();
      const b = JSON.parse(text);
      await store.set(`${n}/book/${book}`, text);
      const index = (await store.get(idxKey, { type: "json" })) || {};
      index[book] = { updated: b.updated || Date.now(), deleted: false };
      await store.setJSON(idxKey, index);
      return json({ ok: true });
    }
    if (req.method === "DELETE" && book) {
      await store.delete(`${n}/book/${book}`);
      const index = (await store.get(idxKey, { type: "json" })) || {};
      index[book] = { updated: Date.now(), deleted: true };
      await store.setJSON(idxKey, index);
      return json({ ok: true });
    }
    return json({ error: "不支持的请求" }, 405);
  } catch (e) {
    return json({ error: "云端存储出错：" + (e && e.message ? e.message : e) }, 500);
  }
};

export const config = { path: "/api/sync" };
