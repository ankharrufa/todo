// API for the task board. The whole board is one JSON document in KV.
//
//   GET  /api/data  -> { version, tasks, deadlines }
//   PUT  /api/data  body { version, tasks, deadlines }
//        Saves only if `version` matches what's stored (so a stale device
//        can't silently overwrite newer edits); otherwise 409 + current doc.
//
// Every request needs the PIN in the X-Pin header. The PIN is a Worker
// secret (npx wrangler secret put PIN). Too many wrong PINs from one IP
// locks that IP out for an hour.

const KEY = "board";
const MAX_FAILS = 10;
const LOCK_SECONDS = 3600;
const EMPTY = { version: 0, tasks: [], deadlines: [] };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/data") return new Response("Not found", { status: 404 });

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    const failKey = `fails:${ip}`;
    const fails = parseInt((await env.TASKS.get(failKey)) || "0", 10);
    if (fails >= MAX_FAILS) return json({ error: "locked" }, 429);

    if (!env.PIN || !sameString(request.headers.get("X-Pin") || "", env.PIN)) {
      await env.TASKS.put(failKey, String(fails + 1), { expirationTtl: LOCK_SECONDS });
      return json({ error: "bad pin" }, 401);
    }

    const stored = (await env.TASKS.get(KEY, "json")) || EMPTY;

    if (request.method === "GET") return json(stored);

    if (request.method === "PUT") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      if (!Array.isArray(body.tasks) || !Array.isArray(body.deadlines)) {
        return json({ error: "bad shape" }, 400);
      }
      if (body.version !== stored.version) return json(stored, 409);
      const next = { version: stored.version + 1, tasks: body.tasks, deadlines: body.deadlines };
      await env.TASKS.put(KEY, JSON.stringify(next));
      return json(next);
    }

    return new Response("Method not allowed", { status: 405 });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
