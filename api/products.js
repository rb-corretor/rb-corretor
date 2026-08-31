import { requireKey, rpc, sendError } from "./_shared.js";

export default async function handler(req, res) {
  try {
    const operatorKey = requireKey(req.query?.operatorKey || req.query?.operatorId, "operatorKey");
    const rows = await rpc("mrs_products", { p_operator_key: operatorKey, p_limit: 100 });
    return res.status(200).json(rows.map((row) => ({ id: row.product_key, product_name: row.product_name, product_code: row.product_code })));
  } catch (error) { return sendError(res, error); }
}
