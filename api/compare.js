import { parseCity, requireKey, rpc, sendError } from "./_shared.js";

export default async function handler(req, res) {
  try {
    const city = parseCity(req.query?.city);
    const args = { p_city_key: city.cityKey, p_state_code: city.stateCode || null, p_type: req.query?.type || null, p_limit: 500 };
    const [a, b] = await Promise.all([
      rpc("mrs_search_network", { ...args, p_operator_key: requireKey(req.query?.operatorAKey, "operatorAKey"), p_product_key: requireKey(req.query?.productAKey || req.query?.productAId, "productAKey") }),
      rpc("mrs_search_network", { ...args, p_operator_key: requireKey(req.query?.operatorBKey, "operatorBKey"), p_product_key: requireKey(req.query?.productBKey || req.query?.productBId, "productBKey") })
    ]);
    const mapA = new Map(a.map((row) => [row.provider_key, row]));
    const mapB = new Map(b.map((row) => [row.provider_key, row]));
    const common = [...mapA].filter(([id]) => mapB.has(id)).map(([, row]) => row);
    const onlyA = [...mapA].filter(([id]) => !mapB.has(id)).map(([, row]) => row);
    const onlyB = [...mapB].filter(([id]) => !mapA.has(id)).map(([, row]) => row);
    return res.status(200).json({ summary: { common: common.length, onlyA: onlyA.length, onlyB: onlyB.length }, common, onlyA, onlyB, truncated: (a[0]?.total_count || 0) > a.length || (b[0]?.total_count || 0) > b.length });
  } catch (error) { return sendError(res, error); }
}
