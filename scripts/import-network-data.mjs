import { readFile } from "node:fs/promises";
const [input] = process.argv.slice(2);
if (!input) throw new Error("Uso: node scripts/import-network-data.mjs <rede_bh.normalized.csv>");
const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!base || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY somente no ambiente local de importação.");
const lines = (await readFile(input, "utf8")).trim().split(/\r?\n/); const headers = lines.shift().split(",").map((x) => x.replaceAll('"', ""));
const parse = (line) => { const cells = []; let value = "", quoted = false; for (let i = 0; i < line.length; i += 1) { const ch = line[i], next = line[i + 1]; if (ch === '"' && quoted && next === '"') { value += ch; i += 1; } else if (ch === '"') quoted = !quoted; else if (ch === "," && !quoted) { cells.push(value); value = ""; } else value += ch; } cells.push(value); return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])); };
const records = lines.filter(Boolean).map(parse).map((record) => ({ ...record, last_updated: record.last_updated || null }));
for (let i = 0; i < records.length; i += 500) { const batch = records.slice(i, i + 500); const response = await fetch(`${base}/rest/v1/network_data?on_conflict=source_row_hash`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(batch) }); if (!response.ok) throw new Error(`Lote ${i / 500 + 1}: ${await response.text()}`); console.log(`Importadas ${Math.min(i + 500, records.length)}/${records.length}`); }
