import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async (req) => {
  const senha = process.env.ADMIN_SENHA;
  if (!senha) return json({ erro: "A variável ADMIN_SENHA não foi configurada no Netlify." }, 500);
  if (req.headers.get("x-senha") !== senha) return json({ erro: "Senha incorreta." }, 401);

  const store = getStore({ name: "presenca", consistency: "strong" });

  if (req.method === "GET") {
    const dados = await store.get("dados", { type: "json" });
    return json(dados || { pessoas: [], reg: {} });
  }

  if (req.method === "POST") {
    let d;
    try { d = await req.json(); } catch { return json({ erro: "JSON inválido." }, 400); }
    if (!d || !Array.isArray(d.pessoas) || typeof d.reg !== "object" || d.reg === null)
      return json({ erro: "Formato inválido." }, 400);
    const pessoas = d.pessoas.filter((p) => typeof p === "string" && p.trim() && p.length <= 60).slice(0, 5000);
    const reg = {};
    for (const [k, v] of Object.entries(d.reg))
      if (/^\d{4}-\d{2}-\d{2}\|.{1,60}$/.test(k) && (v === "P" || v === "F")) reg[k] = v;
    await store.setJSON("dados", { pessoas, reg, atualizado: new Date().toISOString() });
    return json({ ok: true });
  }

  return json({ erro: "Método não permitido." }, 405);
};

export const config = { path: "/api/registros" };
