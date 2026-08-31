export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function getSupabaseConfig() {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!base || !key) throw new ApiError(500, "Variáveis do Supabase não configuradas");
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}

export async function rpc(name, args = {}) {
  const { base, headers } = getSupabaseConfig();
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, base), { method: "POST", headers, body: JSON.stringify(args) });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new ApiError(response.status, body?.message || body?.hint || text || "Falha ao consultar o Supabase");
  return body;
}

const STATES = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);
export const keyFor = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");

export function parseCity(value) {
  let city = String(value || "").trim().replace(/[.,;]+$/, "").replace(/\s+/g, " ");
  if (!city) throw new ApiError(400, "Cidade é obrigatória");
  let stateCode = "";
  const match = city.match(/(?:\s*[-,/]\s*|\s+)([A-Za-z]{2})$/);
  if (match && STATES.has(match[1].toUpperCase())) { stateCode = match[1].toUpperCase(); city = city.slice(0, match.index).trim(); }
  return { city, cityKey: keyFor(city), stateCode };
}

export function requireKey(value, field) {
  const key = keyFor(value);
  if (!key || key.length > 180) throw new ApiError(400, `${field} inválido`);
  return key;
}

export function sendError(res, error) {
  const status = error instanceof ApiError ? error.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: error.message || "Erro interno" });
}
