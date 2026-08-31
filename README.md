# Minha Rede Saúde — pacote final V1

## Incluído
- Frontend responsivo
- Logo Minha Rede Saúde
- API Vercel: operators, products, network, compare, health
- Integração com Supabase por variáveis de ambiente
- Schema SQL com relações e RLS
- Estrutura para carga de dados reais

## Vercel
Variáveis Production:
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY

Os nomes legados `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` continuam aceitos durante a migração. Use somente uma chave publicável/anon; nunca uma chave `service_role`.

## Supabase
Execute `001_producao.sql` no SQL Editor. O script cria apenas a estrutura, RLS, permissões de leitura pública e índices: ele não insere operadoras, produtos ou prestadores fictícios.

## Contratos das APIs
- `GET /api/operators`: operadoras ativas de `network_data` (até 100).
- `GET /api/products?operatorKey=<chave>`: produtos ativos daquela operadora (até 100).
- `GET /api/network?operatorKey=<chave>&productKey=<chave>&city=Belo%20Horizonte%20-%20MG&type=Hospital`: rede limitada a 100 resultados. A cidade aceita também `Belo Horizonte` e `Belo Horizonte MG`.
- `GET /api/compare?operatorAKey=<chave>&productAKey=<chave>&operatorBKey=<chave>&productBKey=<chave>&city=Belo%20Horizonte`: comparação limitada a 500 prestadores por produto; a resposta sinaliza `truncated` se for preciso refinar.

## Base única e importação de Belo Horizonte

As APIs usam exclusivamente `network_data`; execute `002_network_data.sql` no Supabase antes da publicação. O CSV de BH usado nesta entrega está em `C:\Users\User\Downloads\rede_bh.csv` e contém identificadores de plano (`ID_PLANO`), não nomes comerciais. A importação completa e idempotente é:

```powershell
Copy-Item .env.example .env.local # preencha as chaves localmente
node scripts/prepare-rede-bh.mjs .\rede_bh.csv .\rede_bh.normalized.csv
node scripts/import-network-data.mjs .\rede_bh.normalized.csv
```

O normalizador valida as colunas obrigatórias, aceita cabeçalhos usuais em português e cria chaves de busca sem acentos. O importador usa `source_row_hash` para evitar duplicação. Para desenvolvimento local, execute `node scripts/local-server.mjs`.

## Dados reais
O pacote não contém uma “rede nacional inventada”. A rede precisa ser carregada a partir de fontes oficiais/licenciadas. A ANS mantém bases oficiais de produtos/prestadores e a SulAmérica mantém consulta de rede por produto; o Bradesco mantém busca de referenciados para o Nacional Flex.

Fontes:
https://dadosabertos.ans.gov.br/FTP/PDA/produtos_e_prestadores_hospitalares/
https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_e_prestadores_nao_hospitalares/
https://portal.sulamericaseguros.com.br/main.jsp
https://wwws.bradescosaude.com.br/PCBS-BuscaReferenciadoRAD/buscaRedeReferenciada.do

## Importante
Este pacote é o software/infraestrutura. A carga nacional completa deve ser feita e validada antes de apresentar a rede ao cliente como cobertura vigente.
