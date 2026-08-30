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
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY

## Supabase
Execute `supabase/001_producao.sql` no SQL Editor.

## Dados reais
O pacote não contém uma “rede nacional inventada”. A rede precisa ser carregada a partir de fontes oficiais/licenciadas. A ANS mantém bases oficiais de produtos/prestadores e a SulAmérica mantém consulta de rede por produto; o Bradesco mantém busca de referenciados para o Nacional Flex.

Fontes:
https://dadosabertos.ans.gov.br/FTP/PDA/produtos_e_prestadores_hospitalares/
https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_e_prestadores_nao_hospitalares/
https://portal.sulamericaseguros.com.br/main.jsp
https://wwws.bradescosaude.com.br/PCBS-BuscaReferenciadoRAD/buscaRedeReferenciada.do

## Importante
Este pacote é o software/infraestrutura. A carga nacional completa deve ser feita e validada antes de apresentar a rede ao cliente como cobertura vigente.
