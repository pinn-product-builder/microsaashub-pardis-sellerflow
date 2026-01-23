# README — Contrato de Integração VTEX (YAML) | Hermes Pardini (Pardis SellerFlow)

## Por que existe esse pacote

alinhar **payloads (request/response)**, campos e formatos
deixar explícitas as **regras** (paginação, escopo, “sincronizar só faltantes” etc.)
mitigar retrabalho e desalinhamento técnico-funcional

Se vocês aprovarem o que está nos YAMLs, a implementação vai seguir exatamente esse contrato.

---

## O que tem aqui dentro
Este pacote tem **3 YAMLs**, cada um cobrindo uma peça da integração:

1. `vtex-sync-products.contract.yaml`  
   Contrato do sync de **produtos** (Product) VTEX → banco (Supabase)

2. `vtex-sync-skus.contract.yaml`  
   Contrato do sync de **SKUs** (StockKeepingUnit) VTEX → banco (Supabase)

3. `vtex-create-coupon.contract.yaml`  
   Contrato para **criação de cupom/promo** via SellerFlow → VTEX

---

## Como ler os YAMLs
Eu mantive os 3 no mesmo padrão para ficar fácil de revisar. Em geral, vocês vão ver seções assim:

- `contract`: identificação e objetivo do arquivo (o que cobre)
- `environments`: domínio/host esperado, base URL e forma de autenticação (sem expor segredo)
- `interface`: endpoint que o SellerFlow expõe (Edge Function), método e parâmetros
- `upstream_calls`: endpoints da VTEX que são chamados por trás
- `data_persistence`: como e onde persiste no banco (tabelas/chaves/campos)
- `acceptance_criteria`: critérios objetivos pra dizer “ok, está certo”

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
- Quais campos devem ser obrigatórios no banco (principalmente `sku_name` e o vínculo `vtex_product_id`)
- Se o comportamento `missingOnly` deve considerar “faltante” apenas inexistente ou também “incompleto” (ex.: `sku_name` nulo)

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

## Como eu sugiro a validação de vocês
Pra agilizar e evitar idas e voltas, eu sugiro:

1) Revisar os 3 YAMLs  
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

---
Responsável técnico: Pedro Henrique Ventura
