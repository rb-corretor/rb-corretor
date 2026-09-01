import { getSupabaseConfig, keyFor, requireKey, sendError } from "./_shared.js";

const catalogView = () => {
  const view = process.env.PRODUCT_CATALOG_VIEW || "catalogo_produtos";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(view)) throw new Error("PRODUCT_CATALOG_VIEW inválida");
  return view;
};

export default async function handler(req, res) {
  try {
    const operatorKey = requireKey(req.query?.operatorKey || req.query?.operatorId, "operatorKey");
    const { base, headers } = getSupabaseConfig();
    const url = new URL(`/rest/v1/${catalogView()}`, base);
    url.searchParams.set("select", "operadora,id_plano,cd_plano,nome_comercial");
    const response = await fetch(url, { headers });
    const text = await response.text();
    let rows;
    try { rows = text ? JSON.parse(text) : []; } catch { rows = []; }
    if (!response.ok) throw new Error(rows?.message || rows?.hint || text || "Falha ao consultar o catálogo de produtos");

    return res.status(200).json(rows
      .filter((row) => keyFor(row.operadora) === operatorKey && row.id_plano && row.nome_comercial)
      .sort((a, b) => String(a.nome_comercial).localeCompare(String(b.nome_comercial), "pt-BR"))
      .slice(0, 100)
      .map(({ operadora, id_plano, cd_plano, nome_comercial }) => ({ operadora, id_plano, cd_plano, nome_comercial })));
  } catch (error) { return sendError(res, error); }
}
