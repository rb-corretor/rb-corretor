import assert from "node:assert/strict";
import compare from "../api/compare.js";
import health from "../api/health.js";
import network from "../api/network.js";
import operators from "../api/operators.js";
import products from "../api/products.js";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
const providerA = { provider_key: "hospital-central-centro", provider_name: "Hospital Central", provider_type: "Hospital", address: "Centro", phone: "(31) 0000-0000", city_name: "Belo Horizonte", state_code: "MG", total_count: 1 };
globalThis.fetch = async (input, options) => {
  const url = new URL(input), rpc = url.pathname.split("/").pop(), args = JSON.parse(options.body);
  assert.equal(options.method, "POST");
  if (rpc === "mrs_operators") return Response.json([{ operator_key: "operadora-teste", operator_name: "Operadora Teste" }]);
  if (rpc === "mrs_products") { assert.equal(args.p_operator_key, "operadora-teste"); return Response.json([{ product_key: "produto-teste", product_name: "Produto Teste", product_code: "PT-1" }]); }
  if (rpc === "mrs_search_network") {
    assert.equal(args.p_city_key, "belo-horizonte"); assert.ok(args.p_state_code === "MG" || args.p_state_code === null);
    return Response.json(args.p_product_key === "produto-b" ? [providerA, { provider_key: "clinica-sul", provider_name: "Clínica Sul", provider_type: "Clínica", city_name: "Belo Horizonte", state_code: "MG", total_count: 2 }] : [providerA]);
  }
  throw new Error(`RPC inesperada: ${rpc}`);
};
async function call(handler, query = {}) { const result = { status: 0, body: null }; const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; return this; } }; await handler({ query }, res); return result; }
assert.equal((await call(health)).status, 200);
assert.equal((await call(operators)).body[0].id, "operadora-teste");
assert.equal((await call(products, { operatorKey: "Operadora Teste" })).body[0].id, "produto-teste");
assert.equal((await call(products)).status, 400);
for (const city of ["Belo Horizonte", "Belo Horizonte - MG", "Belo Horizonte MG"]) { const result = await call(network, { operatorKey: "Operadora Teste", productKey: "Produto Teste", city, type: "Hospital" }); assert.equal(result.status, 200); assert.equal(result.body.count, 1); }
const comparison = await call(compare, { operatorAKey: "Operadora Teste", productAKey: "Produto Teste", operatorBKey: "Operadora Teste", productBKey: "Produto B", city: "Belo Horizonte - MG" });
assert.deepEqual(comparison.body.summary, { common: 1, onlyA: 0, onlyB: 1 });
console.log("API route tests passed");
