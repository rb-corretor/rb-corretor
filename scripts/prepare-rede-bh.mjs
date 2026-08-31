import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const input = process.argv[2];
if (!input) throw new Error("Uso: node scripts/prepare-rede-bh.mjs <rede_bh.csv> [saida.csv]");
const output = process.argv[3] || resolve("rede_bh.normalized.csv");
const keyFor = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");
const headerKey = (value) => keyFor(value).replaceAll("-", "_");
const aliases = {
  operator_name: ["operator_name", "operadora", "operadora_nome", "operator"], product_name: ["product_name", "produto", "produto_nome", "plano", "nome_produto", "id_plano"],
  product_code: ["product_code", "codigo_produto", "codigo_plano", "cd_plano"], city_name: ["city_name", "cidade", "municipio"], state_code: ["state_code", "uf", "sigla_uf", "estado"],
  provider_name: ["provider_name", "prestador", "nome_prestador", "estabelecimento", "nm_estabelecimento_saude"], provider_type: ["provider_type", "tipo_atendimento", "tipo_prestador", "tipo", "de_clas_estb_saude"],
  address: ["address", "endereco", "logradouro"], neighborhood: ["neighborhood", "bairro"], zip_code: ["zip_code", "cep"], phone: ["phone", "telefone"],
  email: ["email", "e_mail"], cnpj: ["cnpj", "cd_cnpj_estb_saude"], cnes: ["cnes", "cd_cnes"], source_url: ["source_url", "url_fonte", "fonte_url"], last_updated: ["last_updated", "data_atualizacao", "atualizado_em", "dt_atualizacao"], status: ["status", "situacao", "de_situacao_principal"]
};
function parseCsv(text, delimiter) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) { const ch = text[i], next = text[i + 1]; if (ch === '"' && quoted && next === '"') { field += ch; i += 1; } else if (ch === '"') quoted = !quoted; else if (!quoted && ch === delimiter) { row.push(field.trim()); field = ""; } else if (!quoted && (ch === "\n" || ch === "\r")) { if (ch === "\r" && next === "\n") i += 1; row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = ""; } else field += ch; }
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}
const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const raw = (await readFile(input, "utf8")).replace(/^\uFEFF/, ""), firstLine = raw.split(/\r?\n/, 1)[0], rows = parseCsv(raw, (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ";" : ",");
if (rows.length < 2) throw new Error("O CSV não contém cabeçalho e dados.");
const headers = rows[0].map(headerKey), indexFor = (name) => aliases[name].map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1;
const indexes = Object.fromEntries(Object.keys(aliases).map((name) => [name, indexFor(name)]));
for (const required of ["operator_name", "product_name", "city_name", "state_code", "provider_name"]) if (indexes[required] < 0) throw new Error(`Coluna obrigatória ausente: ${required}`);
const columns = ["operator_name", "operator_key", "product_name", "product_key", "product_code", "city_name", "city_key", "state_code", "provider_name", "provider_key", "provider_type", "address", "neighborhood", "zip_code", "phone", "email", "cnpj", "cnes", "source", "source_url", "source_row_hash", "last_updated", "active"];
const normalized = rows.slice(1).map((row, rowIndex) => {
  const value = (name) => indexes[name] < 0 ? "" : String(row[indexes[name]] || "").trim();
  const operator_name = value("operator_name"), product_name = value("product_name"), city_name = value("city_name"), state_code = value("state_code").toUpperCase(), provider_name = value("provider_name");
  if (!operator_name || !product_name || !city_name || !/^[A-Z]{2}$/.test(state_code) || !provider_name) throw new Error(`Linha ${rowIndex + 2} possui campos obrigatórios inválidos.`);
  const status = value("status");
  const record = { operator_name, operator_key: keyFor(operator_name), product_name, product_key: keyFor(product_name), product_code: value("product_code"), city_name, city_key: keyFor(city_name), state_code, provider_name, provider_key: keyFor([value("cnpj"), value("cnes"), provider_name, value("address")].filter(Boolean).join(" ")), provider_type: value("provider_type"), address: value("address"), neighborhood: value("neighborhood"), zip_code: value("zip_code"), phone: value("phone"), email: value("email"), cnpj: value("cnpj"), cnes: value("cnes"), source: basename(input), source_url: value("source_url"), last_updated: value("last_updated"), active: !status || keyFor(status) === "ativo" };
  record.source_row_hash = createHash("sha256").update(JSON.stringify(record)).digest("hex"); return record;
});
await writeFile(output, [columns.join(","), ...normalized.map((record) => columns.map((column) => escapeCsv(record[column])).join(","))].join("\n"), "utf8");
console.log(`Arquivo validado: ${normalized.length} linhas em ${output}`);
