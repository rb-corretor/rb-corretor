import { rpc, sendError } from "./_shared.js";

export default async function handler(_req, res) {
  try {
    const rows = await rpc("mrs_operators", { p_limit: 100 });
    return res.status(200).json(rows.map((row) => ({ id: row.operator_key, name: row.operator_name })));
  } catch (error) { return sendError(res, error); }
}
