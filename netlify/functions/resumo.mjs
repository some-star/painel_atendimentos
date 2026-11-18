import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Endpoint público: devolve SÓ números agregados por mês, nunca as iniciais.
export default async (req) => {
  const url = new URL(req.url);
  let ini = url.searchParams.get("ini") || "0000-01-01";
  let fim = url.searchParams.get("fim") || "9999-12-31";
  if (!DATA.test(ini) || !DATA.test(fim)) return json({ erro: "Datas inválidas." }, 400);
  if (ini > fim) [ini, fim] = [fim, ini];

  const store = getStore({ name: "presenca", consistency: "strong" });
  const dados = (await store.get("dados", { type: "json" })) || { reg: {} };

  const meses = {};
  let atendimentos = 0, faltas = 0;
  for (const [k, v] of Object.entries(dados.reg || {})) {
    const data = k.slice(0, 10);
    if (data < ini || data > fim) continue;
    const m = data.slice(0, 7);
    meses[m] ??= { atendimentos: 0, faltas: 0 };
    meses[m].atendimentos++; atendimentos++;
    if (v === "F") { meses[m].faltas++; faltas++; }
  }

  return json({
    meses: Object.keys(meses).sort().map((mes) => ({ mes, ...meses[mes] })),
    total: { atendimentos, faltas },
    atualizado: dados.atualizado || null,
  });
};

export const config = { path: "/api/resumo" };
