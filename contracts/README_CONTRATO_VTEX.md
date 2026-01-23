# README — Contrato de Integração VTEX (YAML) | Hermes Pardini (Pardis SellerFlow)

## Por que existe esse pacote

alinhar **payloads (request/response)**, campos e formatos
deixar explícitas as **regras** (paginação, escopo, “sincronizar só faltantes” etc.)
mitigar retrabalho e desalinhamento técnico-funcional

Se vocês aprovarem o que está nos YAMLs, a implementação vai seguir exatamente esse contrato.

---

## O que tem aqui dentro
Este pacote tem **7 YAMLs**, cada um cobrindo uma peça da integração:

1. `vtex-sync-products.contract.yaml`  
   Contrato do sync de **produtos** (Product) VTEX → banco (Supabase)

2. `vtex-sync-skus.contract.yaml`  
   Contrato do sync de **SKUs** (StockKeepingUnit) VTEX → banco (Supabase)  
   Inclui **embalagem/gramatura** e **validade** (campo do SKU) conforme solicitações do contrato.

3. `vtex-create-coupon.contract.yaml`  
   Contrato para **criação de cupom/promo** via SellerFlow → VTEX

4. `vtex-sync-clients.contract.yaml`  
   Contrato do sync de **clientes** (Master Data CL/AD) VTEX → banco (Supabase)

5. `vtex-sync-prices.contract.yaml`  
   Contrato do sync de **preços por policy** (Pricing API) VTEX → banco (Supabase)

6. `vtex-sync-inventory.contract.yaml`  
   Contrato do sync de **estoque** (Logistics API) VTEX → banco (Supabase)

7. `vtex-create-orderform.contract.yaml`  
   Contrato do fluxo “**cotação aprovada → carrinho na VTEX**” (criar `orderForm` com itens/preço/estoque + cupom).

---

## Como ler os YAMLs
Eu mantive os 7 no mesmo padrão para ficar fácil de revisar. Em geral, vocês vão ver seções assim:

- `contract`: identificação e objetivo do arquivo (o que cobre)
- `environments`: domínio/host esperado, base URL e forma de autenticação (sem expor segredo)
- `interface`: endpoint que o SellerFlow expõe (Edge Function), método e parâmetros
- `upstream_calls`: endpoints da VTEX que são chamados por trás
- `data_persistence`: como e onde persiste no banco (tabelas/chaves/campos)
- `acceptance_criteria`: critérios objetivos pra dizer “ok, está certo”
- `security`: regras mínimas (quem pode executar, proteção contra abuso, não logar segredo/PII)

---

# 1) vtex-sync-products.contract.yaml — Sync de Produtos

## O que ele faz
Define o contrato do processo que sincroniza **produtos (Product)** da VTEX e persiste no banco do SellerFlow (`vtex_products`).

- **Entrada:** chamada HTTP na Edge Function `vtex-sync-products`
- **Processo:** buscar produto na VTEX por `productId` e normalizar o que faz sentido persistir
- **Saída:** upsert na tabela `vtex_products`
- **Resposta:** métricas do batch (upserted, erros, next page etc.)

## Por que esse sync é necessário
Produto é a entidade “pai” do catálogo e carrega atributos úteis pra:
- identificação e exibição (nome)
- marca e categoria
- status ativo/inativo
- auditoria/evolução (campo `raw` com payload completo)

Além disso, SKU sempre aponta pra ProductId, então manter o produto sincronizado evita inconsistência.

## Pontos que vocês precisam validar
- Se o comportamento **missingOnly** faz sentido como padrão:
  - `missingOnly=true`: sincroniza só o que ainda não existe no banco
  - `missingOnly=false`: re-sincroniza tudo (atualiza atributos)
- Se os campos persistidos em `vtex_products` estão suficientes
- Se a paginação/limites (`page`, `pageSize`) atende o volume

## Critério de aceite (direto)
Rodando até `next=null`, o resultado deve indicar que não existe mais “produto faltante” no escopo definido.

---

# 2) vtex-sync-skus.contract.yaml — Sync de SKUs

## O que ele faz
Define o contrato do processo que sincroniza **SKUs (StockKeepingUnit)** da VTEX e persiste no banco do SellerFlow (`vtex_skus`).

- **Entrada:** chamada HTTP na Edge Function `vtex-sync-skus`
- **Processo:** buscar IDs de SKU por canal e, em seguida, buscar detalhe do SKU por ID
- **Saída:** upsert na tabela `vtex_skus`
- **Resposta:** métricas do batch + paginação

## Por que SKU é o “coração” pra operação
No final do dia, a operação comercial trabalha em cima do SKU (unidade vendável).  
SKU carrega:
- nome completo / nome do SKU
- vínculo com ProductId
- imagens/urls
- dados alternativos (EAN/RefId)
- status do item

Se a ideia é precificar, cotar e aprovar condições, SKU precisa estar consistente.

## Pontos que vocês precisam validar
- Qual **salesChannelId** é o canal correto para o sync (padrão normalmente é `1`, mas precisa ser validado)
- Quais campos devem ser obrigatórios no banco (principalmente `name` e o vínculo `vtex_product_id`)
- Se o comportamento `missingOnly` deve considerar “faltante” apenas inexistente ou também “incompleto” (ex.: `name` nulo)

## Critério de aceite (direto)
Rodando até `next=null`:
- o total de SKUs sincronizados deve bater com o escopo do canal
- não deve sobrar SKU “incompleto” fora das exceções aprovadas

---

# 3) vtex-create-coupon.contract.yaml — Criação de Cupom

## O que ele faz
Define o contrato de criação de cupom/promoção na VTEX a partir do SellerFlow.

- **Entrada:** `POST` com payload padronizado (código, tipo de desconto, validade, limites etc.)
- **Processo:** validação + adaptação do payload para o formato compatível com a VTEX
- **Saída:** criação do cupom na VTEX
- **Resposta:** confirmação clara (sucesso/erro) com identificadores

## O que precisa ficar 100% alinhado aqui
Cupom é onde mais costuma dar retrabalho, então este YAML é o que eu considero mais sensível pra validação de vocês:

- formato do `couponCode`
- tipo de desconto (percentual x valor fixo)
- regras de validade (obrigatória ou opcional)
- limites de uso (total / por cliente)
- acumulatividade (`stackable`) e restrições (se houver)
- rastreio interno (ex.: quote_id / approval_id em metadata)

## Critério de aceite (direto)
- cupom criado deve aparecer na VTEX e funcionar no carrinho/checkout conforme regras aprovadas
- retorno da API precisa ser objetivo: “criou” ou “falhou”, com motivo claro

---

# 4) vtex-sync-clients.contract.yaml — Sync de Clientes

## O que ele faz
Define o contrato do processo que sincroniza **clientes** da VTEX (Master Data) e persiste no banco do SellerFlow (`vtex_clients`).

- **Entrada:** chamada HTTP na Edge Function `vtex-sync-clients`
- **Processo:** consumir Master Data `CL` via `/scroll` (para alto volume) e, opcionalmente, enriquecer com cidade/UF via `AD`
- **Saída:** upsert na tabela `vtex_clients` (PK = `md_id`)
- **Resposta:** métricas do batch + `nextToken`/`done` quando em scroll

## Por que esse sync é necessário
O módulo de cotação depende de cliente real para:
- selecionar cliente na Nova Cotação
- aplicar regras comerciais (tabela de preço / L2L / UF/cidade)
- restringir cupom por CNPJ

## Pontos que vocês precisam validar
- Qual é o conjunto mínimo de campos necessários (CNPJ, IE, cidade/UF)
- Se o enriquecimento via `AD` (cidade/UF) deve ser obrigatório (`withAddress=true`) ou opcional
- Se existem campos sensíveis que não devem ser persistidos (PII)

## Critério de aceite (direto)
Rodando em modo `all=true` (scroll) até `done=true`:
- a tela **Cadastros → Clientes** deve mostrar a base
- a tela **Nova Cotação** deve conseguir selecionar clientes reais

---

# 5) vtex-sync-prices.contract.yaml — Sync de Preços (por Policy)

## O que ele faz
Define o contrato do processo que sincroniza **preços** por `trade_policy_id` da VTEX e persiste no banco do SellerFlow (`vtex_sku_prices`).

- **Entrada:** chamada HTTP na Edge Function `vtex-sync-prices` com `sc=<tradePolicyId>`
- **Processo:** buscar preços base/computed (conforme Pricing API) e normalizar valores monetários
- **Saída:** upsert em `vtex_sku_prices`
- **Resposta:** métricas do batch + contagem de SKUs sem preço (`missingCount`)

## Pontos que vocês precisam validar
- Quais `tradePolicyId` devem ser sincronizadas (ex.: policy 1, 2 e policies nomeadas)
- Regras de fallback do preço efetivo (computed → fixed → list → base)
- Tratamento de SKU sem preço (404) deve ser “missing” e não erro fatal

## Critério de aceite (direto)
- Para cada policy sincronizada, os SKUs com preço devem aparecer com `trade_policy_id` correto
- A tela de produtos/cotação deve conseguir alternar policy e refletir o preço esperado

---

# 6) vtex-sync-inventory.contract.yaml — Sync de Estoque

## O que ele faz
Define o contrato do processo que sincroniza **estoque** por SKU via Logistics API e persiste em `vtex_sku_inventory`.

- **Entrada:** chamada HTTP na Edge Function `vtex-sync-inventory`
- **Processo:** consultar estoque do SKU e persistir por warehouse (payload completo em `raw`)
- **Saída:** upsert em `vtex_sku_inventory` + uso da view agregada `vw_vtex_sku_inventory_agg` no app
- **Resposta:** métricas do batch + paginação

## Pontos que vocês precisam validar
- Qual métrica usar como “estoque disponível” (available vs total-reserved)
- Se existe warehouse específico a ser priorizado
- Frequência ideal de sync (ex.: a cada 20min)

## Critério de aceite (direto)
- O catálogo deve expor `available_quantity`/`in_stock`
- A validação do carrinho deve bloquear item sem estoque suficiente

---

# 7) vtex-create-orderform.contract.yaml — Cotação aprovada → Carrinho VTEX (OrderForm)

## O que ele faz
Define o contrato para transformar uma **cotação aprovada** em um **carrinho na VTEX** (`orderForm`) para finalizar o pedido.

- **Entrada:** `POST` na Edge Function `vtex-create-orderform` com `quoteId`
- **Processo:** validar itens (preço/estoque/policy), criar `orderForm`, inserir itens e aplicar cupom (se houver)
- **Saída:** grava `vtex_order_form_id` na cotação (`vtex_quotes`) e registra evento em `vtex_quote_events`
- **Resposta:** `orderFormId` e resumo do carrinho

## Pontos que vocês precisam validar
- Em que momento o cupom é criado e aplicado (ideal: após aprovação e antes do orderForm)
- Quais campos de cliente são necessários para associar o carrinho ao comprador
- Política/cluster: como escolher `tradePolicyId` no envio final

## Critério de aceite (direto)
- Uma cotação aprovada deve gerar um `orderForm` com itens e quantidades corretas
- Se houver cupom, `marketingData.coupon` deve estar preenchido

---

## Como eu sugiro a validação de vocês
Pra agilizar e evitar idas e voltas, eu sugiro:

1) Revisar os 7 YAMLs  
2) Responder em cima de cada arquivo:
- **APROVADO**  
ou  
- ajustes solicitados (lista objetiva)

Assim que estiver aprovado, eu sigo pra implementação final seguindo o contrato fechado.

---

## Observações importantes (pra não confundir)
- Segredos (AppKey/AppToken) não ficam no YAML.
- YAML descreve contrato de payload e regra; infra/CI/log detalhado é parte interna.
- Se surgir regra nova (ex.: restrição por cluster/seller/canal no cupom), eu volto no YAML primeiro antes de implementar.
- As Edge Functions de sync **não** devem ficar abertas: execução é restrita (admin autenticado ou `x-vtex-sync-secret`).

## Contato / Responsável
- Responsável técnico: Pedro Henrique Ventura (Pinn)
- Integração: Pardis SellerFlow + VTEX