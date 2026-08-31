import { parseCity, requireKey, rpc, sendError } from "./_shared.js";

export default async function handler(req, res) {
  try {
    const operatorKey = requireKey(req.query?.operatorKey, "operatorKey");
    const productKey = requireKey(req.query?.productKey || req.query?.productId, "productKey");
    const city = parseCity(req.query?.city);
    const rows = await rpc("mrs_search_network", { p_operator_key: operatorKey, p_product_key: productKey, p_city_key: city.cityKey, p_state_code: city.stateCode || null, p_type: req.query?.type || null, p_limit: 100 });
    const total = rows[0]?.total_count || 0;
    return res.status(200).json({ count: total, rows, city: city.city, truncated: total > rows.length });
  } catch (error) { return sendError(res, error); }
}
