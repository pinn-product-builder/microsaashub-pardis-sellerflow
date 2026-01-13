// Gerador de documento PDF de Regras de Negócio - Sistema CPQ Pardis
// Focado nos módulos: Login/Logout, Cotação, Cadastros e Gestão de Usuários

export interface ApprovalRule {
  name: string;
  margin_min: number | null;
  margin_max: number | null;
  approver_role: string;
  priority: string;
  sla_hours: number;
}

export interface PricingConfig {
  region: string;
  admin_percent: number;
  logistics_percent: number;
  icms_percent: number;
  pis_cofins_percent: number;
  lab_to_lab_discount: number;
}

export interface PricingEngineConfig {
  default_markup_mg: number;
  default_markup_br: number;
  margin_green_threshold: number;
  margin_yellow_threshold: number;
  margin_orange_threshold: number;
  margin_authorized_threshold: number;
  minimum_price_margin_target: number;
}

export interface PaymentCondition {
  name: string;
  days: number;
  adjustment_percent: number;
}

export interface Permission {
  code: string;
  name: string;
  description: string;
  module: string;
}

export interface DocumentData {
  approvalRules: ApprovalRule[];
  pricingConfigs: PricingConfig[];
  engineConfig: PricingEngineConfig;
  paymentConditions: PaymentCondition[];
  permissions: Permission[];
  generatedAt: Date;
  version: string;
}

const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    vendedor: 'Vendedor',
    coordenador: 'Coordenador',
    gerente: 'Gerente',
    diretor: 'Diretor',
    admin: 'Administrador'
  };
  return roles[role] || role;
};

const formatPriority = (priority: string) => {
  const priorities: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return priorities[priority] || priority;
};

const getMarginColor = (marginMin: number | null, marginMax: number | null) => {
  if (marginMin !== null && marginMin >= 0) return '#22c55e'; // Verde
  if (marginMin !== null && marginMin >= -5) return '#eab308'; // Amarelo
  if (marginMin !== null && marginMin >= -10) return '#f97316'; // Laranja
  return '#ef4444'; // Vermelho
};

export function generateBusinessRulesHTML(data: DocumentData): string {
  const { approvalRules, pricingConfigs, engineConfig, paymentConditions, permissions, generatedAt, version } = data;

  const mgConfig = pricingConfigs.find(c => c.region === 'MG');
  const brConfig = pricingConfigs.find(c => c.region === 'BR');

  // Agrupar permissões por módulo
  const permissionsByModule: Record<string, Permission[]> = {};
  permissions.forEach(p => {
    if (!permissionsByModule[p.module]) {
      permissionsByModule[p.module] = [];
    }
    permissionsByModule[p.module].push(p);
  });

  const moduleLabels: Record<string, string> = {
    auth: 'Autenticação',
    users: 'Gestão de Usuários',
    quotes: 'Cotações',
    customers: 'Clientes',
    products: 'Produtos',
    config: 'Configurações'
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Regras de Negócio - Sistema CPQ Pardis</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      font-size: 11pt;
    }
    
    .page {
      page-break-after: always;
      padding: 0;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    /* CAPA */
    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 40px;
    }
    
    .cover-logo {
      width: 120px;
      height: 120px;
      background: white;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 40px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    
    .cover-logo span {
      font-size: 48px;
      font-weight: bold;
      color: #1e3a5f;
    }
    
    .cover h1 {
      font-size: 36pt;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .cover h2 {
      font-size: 18pt;
      font-weight: 400;
      opacity: 0.9;
      margin-bottom: 60px;
    }
    
    .cover-meta {
      margin-top: auto;
      opacity: 0.8;
      font-size: 10pt;
    }
    
    .cover-meta p {
      margin: 5px 0;
    }
    
    /* CONTEÚDO */
    .content {
      padding: 20px 0;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 15px;
      border-bottom: 2px solid #1e3a5f;
      margin-bottom: 25px;
    }
    
    .header-title {
      font-size: 14pt;
      font-weight: 600;
      color: #1e3a5f;
    }
    
    .header-version {
      font-size: 9pt;
      color: #666;
    }
    
    h2 {
      font-size: 16pt;
      color: #1e3a5f;
      margin: 30px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    h3 {
      font-size: 13pt;
      color: #2d5a87;
      margin: 20px 0 10px 0;
    }
    
    h4 {
      font-size: 11pt;
      color: #374151;
      margin: 15px 0 8px 0;
    }
    
    p {
      margin: 8px 0;
      text-align: justify;
    }
    
    .intro-box {
      background: #f0f7ff;
      border-left: 4px solid #1e3a5f;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .intro-box p {
      margin: 0;
      color: #1e3a5f;
    }
    
    /* TABELAS */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
    }
    
    th {
      background: #1e3a5f;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tr:nth-child(even) {
      background: #f9fafb;
    }
    
    tr:hover {
      background: #f0f7ff;
    }
    
    .table-compact td, .table-compact th {
      padding: 8px 10px;
    }
    
    /* BADGES E INDICADORES */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
    }
    
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-yellow { background: #fef9c3; color: #854d0e; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    
    .margin-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    /* FÓRMULAS */
    .formula-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px 20px;
      margin: 10px 0;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
    }
    
    .formula-box code {
      color: #1e3a5f;
      font-weight: 600;
    }
    
    /* FLUXOGRAMAS */
    .flow-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 15px 0;
      justify-content: center;
    }
    
    .flow-step {
      background: #f0f7ff;
      border: 2px solid #1e3a5f;
      border-radius: 8px;
      padding: 10px 15px;
      text-align: center;
      min-width: 100px;
    }
    
    .flow-step.active {
      background: #1e3a5f;
      color: white;
    }
    
    .flow-arrow {
      display: flex;
      align-items: center;
      color: #1e3a5f;
      font-size: 18pt;
    }
    
    /* LISTA DE VERIFICAÇÃO */
    .checklist {
      list-style: none;
      padding: 0;
    }
    
    .checklist li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    
    .checklist li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #22c55e;
      font-weight: bold;
    }
    
    /* CARDS */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 15px 0;
    }
    
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    
    .card-title {
      font-weight: 600;
      color: #1e3a5f;
      margin-bottom: 8px;
    }
    
    .card-value {
      font-size: 18pt;
      font-weight: 700;
      color: #2d5a87;
    }
    
    /* SUMÁRIO */
    .toc {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px 30px;
      margin: 20px 0;
    }
    
    .toc h3 {
      margin-top: 0;
      margin-bottom: 15px;
    }
    
    .toc-list {
      list-style: none;
      padding: 0;
    }
    
    .toc-list li {
      padding: 8px 0;
      border-bottom: 1px dotted #d1d5db;
      display: flex;
      justify-content: space-between;
    }
    
    .toc-list li:last-child {
      border-bottom: none;
    }
    
    .toc-number {
      color: #1e3a5f;
      font-weight: 600;
      margin-right: 10px;
    }
    
    /* RODAPÉ */
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 9pt;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    
    /* ALERTAS */
    .alert {
      padding: 12px 15px;
      border-radius: 8px;
      margin: 10px 0;
    }
    
    .alert-info {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }
    
    .alert-warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .page {
        page-break-after: always;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <!-- CAPA -->
  <div class="page cover">
    <div class="cover-logo">
      <span>P</span>
    </div>
    <h1>Sistema CPQ Pardis</h1>
    <h2>Documento de Regras de Negócio</h2>
    <div class="cover-meta">
      <p><strong>Versão:</strong> ${version}</p>
      <p><strong>Data de Geração:</strong> ${generatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <p><strong>Módulos:</strong> Autenticação | Cotações | Cadastros | Gestão de Usuários</p>
    </div>
  </div>

  <!-- SUMÁRIO -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>
      
      <div class="toc">
        <h3>Sumário</h3>
        <ol class="toc-list">
          <li><span><span class="toc-number">1.</span> Visão Geral do Sistema</span></li>
          <li><span><span class="toc-number">2.</span> Módulo de Autenticação (Login/Logout)</span></li>
          <li><span><span class="toc-number">3.</span> Módulo de Cotações</span></li>
          <li><span><span class="toc-number">4.</span> Módulo de Cadastros</span></li>
          <li><span><span class="toc-number">5.</span> Módulo de Gestão de Usuários</span></li>
          <li><span><span class="toc-number">6.</span> Matriz de Permissões</span></li>
        </ol>
      </div>

      <h2>1. Visão Geral do Sistema</h2>
      
      <div class="intro-box">
        <p>O Sistema CPQ (Configure, Price, Quote) Pardis é uma solução integrada para gestão de cotações comerciais, desenvolvida para otimizar o processo de precificação e aprovação de propostas comerciais.</p>
      </div>

      <h3>1.1 Escopo desta Documentação</h3>
      <p>Este documento abrange os seguintes módulos do sistema:</p>
      
      <div class="card-grid">
        <div class="card">
          <div class="card-title">🔐 Autenticação</div>
          <p>Login, logout e controle de sessão</p>
        </div>
        <div class="card">
          <div class="card-title">📋 Cotações</div>
          <p>Criação, cálculo e aprovação de propostas</p>
        </div>
        <div class="card">
          <div class="card-title">📦 Cadastros</div>
          <p>Gestão de clientes e produtos</p>
        </div>
        <div class="card">
          <div class="card-title">👥 Gestão de Usuários</div>
          <p>Usuários, grupos e permissões</p>
        </div>
      </div>

      <h3>1.2 Perfis de Acesso</h3>
      <table>
        <thead>
          <tr>
            <th>Perfil</th>
            <th>Descrição</th>
            <th>Nível de Aprovação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-gray">Vendedor</span></td>
            <td>Usuário operacional que cria cotações</td>
            <td>Margem ≥ 0%</td>
          </tr>
          <tr>
            <td><span class="badge badge-blue">Coordenador</span></td>
            <td>Supervisiona vendedores e aprova margens baixas</td>
            <td>Margem -5% a 0%</td>
          </tr>
          <tr>
            <td><span class="badge badge-orange">Gerente</span></td>
            <td>Gestão comercial e aprovações especiais</td>
            <td>Margem -10% a -5%</td>
          </tr>
          <tr>
            <td><span class="badge badge-red">Diretor</span></td>
            <td>Aprovações críticas e estratégicas</td>
            <td>Margem &lt; -10%</td>
          </tr>
          <tr>
            <td><span class="badge badge-green">Admin</span></td>
            <td>Acesso total ao sistema</td>
            <td>Todas</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 1</span>
      </div>
    </div>
  </div>

  <!-- MÓDULO DE AUTENTICAÇÃO -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>

      <h2>2. Módulo de Autenticação (Login/Logout)</h2>

      <h3>2.1 Fluxo de Login</h3>
      <div class="flow-container">
        <div class="flow-step">Tela de Login</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">Validar Credenciais</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">Carregar Perfil</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">Carregar Permissões</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step active">Dashboard</div>
      </div>

      <h3>2.2 Regras de Autenticação</h3>
      <table>
        <thead>
          <tr>
            <th>Regra</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RN-AUTH-01</strong></td>
            <td>O login é realizado via e-mail e senha</td>
          </tr>
          <tr>
            <td><strong>RN-AUTH-02</strong></td>
            <td>Após login bem-sucedido, o sistema carrega automaticamente o perfil e permissões do usuário</td>
          </tr>
          <tr>
            <td><strong>RN-AUTH-03</strong></td>
            <td>Usuários inativos não podem fazer login</td>
          </tr>
          <tr>
            <td><strong>RN-AUTH-04</strong></td>
            <td>A sessão é mantida até o logout explícito ou expiração do token</td>
          </tr>
          <tr>
            <td><strong>RN-AUTH-05</strong></td>
            <td>Existe funcionalidade de recuperação de senha via e-mail</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Regras de Logout</h3>
      <table>
        <thead>
          <tr>
            <th>Regra</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RN-AUTH-06</strong></td>
            <td>O logout invalida a sessão atual do usuário</td>
          </tr>
          <tr>
            <td><strong>RN-AUTH-07</strong></td>
            <td>Após logout, o usuário é redirecionado para a tela de login</td>
          </tr>
          <tr>
            <td><strong>RN-AUTH-08</strong></td>
            <td>Dados em cache são limpos no logout</td>
          </tr>
        </tbody>
      </table>

      <h3>2.4 Controle de Acesso</h3>
      <div class="alert alert-info">
        <strong>Importante:</strong> Todas as rotas do sistema (exceto login, registro e recuperação de senha) são protegidas e requerem autenticação.
      </div>

      <ul class="checklist">
        <li>Rotas públicas: /login, /register, /forgot-password</li>
        <li>Rotas protegidas: /cpq/*, /cadastros/*, /admin/*</li>
        <li>Verificação de permissões por funcionalidade</li>
        <li>Redirecionamento automático para login quando não autenticado</li>
      </ul>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 2</span>
      </div>
    </div>
  </div>

  <!-- MÓDULO DE COTAÇÕES - PARTE 1 -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>

      <h2>3. Módulo de Cotações</h2>

      <h3>3.1 Ciclo de Vida da Cotação</h3>
      <div class="flow-container">
        <div class="flow-step">Rascunho</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">Calculada</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">Aguard. Aprovação</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">Aprovada</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">Enviada</div>
        <div class="flow-arrow">→</div>
        <div class="flow-step active">Convertida</div>
      </div>

      <table class="table-compact">
        <thead>
          <tr>
            <th>Status</th>
            <th>Descrição</th>
            <th>Próximas Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-gray">draft</span></td>
            <td>Cotação em elaboração</td>
            <td>Editar, Calcular, Excluir</td>
          </tr>
          <tr>
            <td><span class="badge badge-blue">calculated</span></td>
            <td>Preços calculados</td>
            <td>Editar, Solicitar Aprovação, Enviar</td>
          </tr>
          <tr>
            <td><span class="badge badge-yellow">pending_approval</span></td>
            <td>Aguardando aprovação</td>
            <td>Aprovar, Rejeitar</td>
          </tr>
          <tr>
            <td><span class="badge badge-green">approved</span></td>
            <td>Aprovada para envio</td>
            <td>Enviar ao cliente</td>
          </tr>
          <tr>
            <td><span class="badge badge-red">rejected</span></td>
            <td>Rejeitada</td>
            <td>Editar e resubmeter</td>
          </tr>
          <tr>
            <td><span class="badge badge-blue">sent</span></td>
            <td>Enviada ao cliente</td>
            <td>Converter em pedido</td>
          </tr>
          <tr>
            <td><span class="badge badge-gray">expired</span></td>
            <td>Prazo de validade expirado</td>
            <td>Duplicar</td>
          </tr>
          <tr>
            <td><span class="badge badge-green">converted</span></td>
            <td>Convertida em pedido</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>

      <h3>3.2 Regras de Precificação por Região</h3>
      <table>
        <thead>
          <tr>
            <th>Parâmetro</th>
            <th>Minas Gerais (MG)</th>
            <th>Brasil (BR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Markup Padrão</td>
            <td><strong>${formatPercent(engineConfig.default_markup_mg * 100 - 100)}</strong></td>
            <td><strong>${formatPercent(engineConfig.default_markup_br * 100 - 100)}</strong></td>
          </tr>
          <tr>
            <td>ICMS</td>
            <td>${formatPercent(mgConfig?.icms_percent || 0)}</td>
            <td>${formatPercent(brConfig?.icms_percent || 0)}</td>
          </tr>
          <tr>
            <td>PIS/COFINS</td>
            <td>${formatPercent(mgConfig?.pis_cofins_percent || 0)}</td>
            <td>${formatPercent(brConfig?.pis_cofins_percent || 0)}</td>
          </tr>
          <tr>
            <td>Custo Administrativo</td>
            <td>${formatPercent(mgConfig?.admin_percent || 0)}</td>
            <td>${formatPercent(brConfig?.admin_percent || 0)}</td>
          </tr>
          <tr>
            <td>Custo Logístico</td>
            <td>${formatPercent(mgConfig?.logistics_percent || 0)}</td>
            <td>${formatPercent(brConfig?.logistics_percent || 0)}</td>
          </tr>
          <tr>
            <td>Desconto Lab-to-Lab</td>
            <td colspan="2" style="text-align: center">${formatPercent(mgConfig?.lab_to_lab_discount || 0)}</td>
          </tr>
        </tbody>
      </table>

      <h3>3.3 Fórmulas de Margem</h3>
      <h4>Margem Bruta</h4>
      <div class="formula-box">
        <code>Margem Bruta = ((Preço Ofertado - Custo Base) / Preço Ofertado) × 100</code>
      </div>

      <h4>Margem Líquida (considera custos operacionais)</h4>
      <div class="formula-box">
        <code>Margem Líquida = Margem Bruta - Admin% - Logística% - ICMS% - PIS/COFINS%</code>
      </div>

      <h4>Preço Mínimo (margem alvo: ${formatPercent(engineConfig.minimum_price_margin_target)})</h4>
      <div class="formula-box">
        <code>Preço Mínimo = Custo Base / (1 - Margem Alvo - Overhead Total)</code>
      </div>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 3</span>
      </div>
    </div>
  </div>

  <!-- MÓDULO DE COTAÇÕES - PARTE 2 -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>

      <h3>3.4 Indicador Visual de Margem (Semáforo)</h3>
      <table>
        <thead>
          <tr>
            <th>Cor</th>
            <th>Faixa de Margem</th>
            <th>Significado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="margin-indicator" style="background: #22c55e;"></span> Verde</td>
            <td>≥ ${formatPercent(engineConfig.margin_green_threshold)}</td>
            <td>Margem saudável - aprovação automática</td>
          </tr>
          <tr>
            <td><span class="margin-indicator" style="background: #eab308;"></span> Amarelo</td>
            <td>${formatPercent(engineConfig.margin_yellow_threshold)} a ${formatPercent(engineConfig.margin_green_threshold)}</td>
            <td>Margem aceitável - atenção recomendada</td>
          </tr>
          <tr>
            <td><span class="margin-indicator" style="background: #f97316;"></span> Laranja</td>
            <td>${formatPercent(engineConfig.margin_orange_threshold)} a ${formatPercent(engineConfig.margin_yellow_threshold)}</td>
            <td>Margem baixa - requer aprovação</td>
          </tr>
          <tr>
            <td><span class="margin-indicator" style="background: #ef4444;"></span> Vermelho</td>
            <td>&lt; ${formatPercent(engineConfig.margin_orange_threshold)}</td>
            <td>Margem crítica - aprovação diretoria</td>
          </tr>
        </tbody>
      </table>

      <h3>3.5 Matriz de Aprovação</h3>
      <table>
        <thead>
          <tr>
            <th>Faixa de Margem</th>
            <th>Aprovador</th>
            <th>Prioridade</th>
            <th>SLA</th>
          </tr>
        </thead>
        <tbody>
          ${approvalRules.sort((a, b) => (b.margin_min ?? -999) - (a.margin_min ?? -999)).map(rule => `
          <tr>
            <td style="border-left: 4px solid ${getMarginColor(rule.margin_min, rule.margin_max)};">
              ${rule.margin_min !== null && rule.margin_max !== null 
                ? `${formatPercent(rule.margin_min)} a ${formatPercent(rule.margin_max)}`
                : rule.margin_min !== null 
                  ? `≥ ${formatPercent(rule.margin_min)}`
                  : `< ${formatPercent(rule.margin_max!)}`
              }
            </td>
            <td><strong>${formatRole(rule.approver_role)}</strong></td>
            <td><span class="badge badge-${rule.priority === 'critical' ? 'red' : rule.priority === 'high' ? 'orange' : rule.priority === 'medium' ? 'yellow' : 'green'}">${formatPriority(rule.priority)}</span></td>
            <td>${rule.sla_hours > 0 ? `${rule.sla_hours}h` : 'Automático'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="alert alert-warning">
        <strong>Regra Crítica:</strong> Qualquer cotação com pelo menos um item com margem negativa requer aprovação, independentemente da margem total.
      </div>

      <h3>3.6 Condições de Pagamento</h3>
      <table>
        <thead>
          <tr>
            <th>Condição</th>
            <th>Prazo (dias)</th>
            <th>Ajuste no Preço</th>
          </tr>
        </thead>
        <tbody>
          ${paymentConditions.map(cond => `
          <tr>
            <td>${cond.name}</td>
            <td>${cond.days}</td>
            <td>${cond.adjustment_percent > 0 ? '+' : ''}${formatPercent(cond.adjustment_percent)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>

      <h3>3.7 Validade da Proposta</h3>
      <ul class="checklist">
        <li>Validade padrão: <strong>7 dias</strong> a partir da criação</li>
        <li>Cotações expiradas recebem status "expired" automaticamente</li>
        <li>Cotações expiradas podem ser duplicadas para criar nova proposta</li>
      </ul>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 4</span>
      </div>
    </div>
  </div>

  <!-- MÓDULO DE CADASTROS -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>

      <h2>4. Módulo de Cadastros</h2>

      <h3>4.1 Cadastro de Clientes</h3>
      
      <h4>4.1.1 Campos Obrigatórios</h4>
      <table>
        <thead>
          <tr>
            <th>Campo</th>
            <th>Tipo</th>
            <th>Validação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Razão Social</td>
            <td>Texto</td>
            <td>Obrigatório</td>
          </tr>
          <tr>
            <td>CNPJ</td>
            <td>Texto</td>
            <td>Obrigatório, formato válido</td>
          </tr>
          <tr>
            <td>Cidade</td>
            <td>Texto</td>
            <td>Obrigatório</td>
          </tr>
          <tr>
            <td>UF</td>
            <td>Texto (2 caracteres)</td>
            <td>Obrigatório</td>
          </tr>
        </tbody>
      </table>

      <h4>4.1.2 Regras de Negócio - Clientes</h4>
      <table>
        <thead>
          <tr>
            <th>Regra</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RN-CLI-01</strong></td>
            <td>CNPJ deve ser único no sistema</td>
          </tr>
          <tr>
            <td><strong>RN-CLI-02</strong></td>
            <td>Cliente pode ser marcado como "Lab-to-Lab" para desconto especial</td>
          </tr>
          <tr>
            <td><strong>RN-CLI-03</strong></td>
            <td>A UF do cliente define a região de precificação (MG ou BR)</td>
          </tr>
          <tr>
            <td><strong>RN-CLI-04</strong></td>
            <td>Cliente pode ter limite de crédito definido</td>
          </tr>
          <tr>
            <td><strong>RN-CLI-05</strong></td>
            <td>Condições de pagamento disponíveis podem ser personalizadas por cliente</td>
          </tr>
          <tr>
            <td><strong>RN-CLI-06</strong></td>
            <td>Cliente pode ser desativado sem exclusão (soft delete)</td>
          </tr>
        </tbody>
      </table>

      <h3>4.2 Cadastro de Produtos</h3>

      <h4>4.2.1 Campos Obrigatórios</h4>
      <table>
        <thead>
          <tr>
            <th>Campo</th>
            <th>Tipo</th>
            <th>Validação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nome</td>
            <td>Texto</td>
            <td>Obrigatório</td>
          </tr>
          <tr>
            <td>SKU</td>
            <td>Texto</td>
            <td>Obrigatório, único</td>
          </tr>
          <tr>
            <td>Custo Base</td>
            <td>Decimal</td>
            <td>Obrigatório, maior que zero</td>
          </tr>
        </tbody>
      </table>

      <h4>4.2.2 Regras de Negócio - Produtos</h4>
      <table>
        <thead>
          <tr>
            <th>Regra</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RN-PROD-01</strong></td>
            <td>SKU deve ser único no sistema</td>
          </tr>
          <tr>
            <td><strong>RN-PROD-02</strong></td>
            <td>Preços regionais (MG/BR) são calculados automaticamente a partir do custo base + markup</td>
          </tr>
          <tr>
            <td><strong>RN-PROD-03</strong></td>
            <td>Preço mínimo é calculado para garantir margem alvo</td>
          </tr>
          <tr>
            <td><strong>RN-PROD-04</strong></td>
            <td>Produtos podem ter campanhas promocionais com desconto adicional</td>
          </tr>
          <tr>
            <td><strong>RN-PROD-05</strong></td>
            <td>Estoque é informativo e não bloqueia cotação</td>
          </tr>
          <tr>
            <td><strong>RN-PROD-06</strong></td>
            <td>Produto pode ser desativado sem exclusão (soft delete)</td>
          </tr>
          <tr>
            <td><strong>RN-PROD-07</strong></td>
            <td>Importação em massa via CSV é suportada</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 5</span>
      </div>
    </div>
  </div>

  <!-- MÓDULO DE GESTÃO DE USUÁRIOS -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>

      <h2>5. Módulo de Gestão de Usuários</h2>

      <h3>5.1 Cadastro de Usuários</h3>
      <table>
        <thead>
          <tr>
            <th>Campo</th>
            <th>Tipo</th>
            <th>Validação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nome Completo</td>
            <td>Texto</td>
            <td>Obrigatório</td>
          </tr>
          <tr>
            <td>E-mail</td>
            <td>Texto</td>
            <td>Obrigatório, formato válido, único</td>
          </tr>
          <tr>
            <td>Senha</td>
            <td>Texto</td>
            <td>Mínimo 6 caracteres</td>
          </tr>
          <tr>
            <td>Região</td>
            <td>Enum (MG/BR)</td>
            <td>Opcional</td>
          </tr>
        </tbody>
      </table>

      <h3>5.2 Regras de Negócio - Usuários</h3>
      <table>
        <thead>
          <tr>
            <th>Regra</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RN-USR-01</strong></td>
            <td>E-mail deve ser único no sistema</td>
          </tr>
          <tr>
            <td><strong>RN-USR-02</strong></td>
            <td>Usuário deve pertencer a pelo menos um grupo</td>
          </tr>
          <tr>
            <td><strong>RN-USR-03</strong></td>
            <td>Permissões são herdadas dos grupos do usuário</td>
          </tr>
          <tr>
            <td><strong>RN-USR-04</strong></td>
            <td>Usuário pode ter permissões individuais (sobrescrevem grupo)</td>
          </tr>
          <tr>
            <td><strong>RN-USR-05</strong></td>
            <td>Usuário pode ser desativado sem exclusão</td>
          </tr>
          <tr>
            <td><strong>RN-USR-06</strong></td>
            <td>Administradores têm todas as permissões automaticamente</td>
          </tr>
        </tbody>
      </table>

      <h3>5.3 Gestão de Grupos</h3>
      <table>
        <thead>
          <tr>
            <th>Regra</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RN-GRP-01</strong></td>
            <td>Nome do grupo deve ser único</td>
          </tr>
          <tr>
            <td><strong>RN-GRP-02</strong></td>
            <td>Grupos de sistema (is_system = true) não podem ser excluídos</td>
          </tr>
          <tr>
            <td><strong>RN-GRP-03</strong></td>
            <td>Grupo pode ter múltiplas permissões atribuídas</td>
          </tr>
          <tr>
            <td><strong>RN-GRP-04</strong></td>
            <td>Alterações em permissões de grupo afetam todos os membros</td>
          </tr>
        </tbody>
      </table>

      <h3>5.4 Hierarquia de Papéis (Roles)</h3>
      <p>Os papéis definem o nível de aprovação e acesso às funcionalidades críticas:</p>
      
      <div class="flow-container" style="flex-direction: column; align-items: center;">
        <div class="flow-step" style="background: #166534; color: white; border-color: #166534;">Admin</div>
        <div class="flow-arrow" style="transform: rotate(90deg);">→</div>
        <div class="flow-step" style="background: #991b1b; color: white; border-color: #991b1b;">Diretor</div>
        <div class="flow-arrow" style="transform: rotate(90deg);">→</div>
        <div class="flow-step" style="background: #c2410c; color: white; border-color: #c2410c;">Gerente</div>
        <div class="flow-arrow" style="transform: rotate(90deg);">→</div>
        <div class="flow-step" style="background: #1e40af; color: white; border-color: #1e40af;">Coordenador</div>
        <div class="flow-arrow" style="transform: rotate(90deg);">→</div>
        <div class="flow-step">Vendedor</div>
      </div>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 6</span>
      </div>
    </div>
  </div>

  <!-- MATRIZ DE PERMISSÕES -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>

      <h2>6. Matriz de Permissões</h2>

      <p>O sistema utiliza controle de acesso baseado em permissões. Cada funcionalidade possui uma permissão específica que pode ser atribuída a grupos ou usuários individualmente.</p>

      ${Object.entries(permissionsByModule).map(([module, perms]) => `
        <h3>6.${Object.keys(permissionsByModule).indexOf(module) + 1} ${moduleLabels[module] || module}</h3>
        <table class="table-compact">
          <thead>
            <tr>
              <th>Código</th>
              <th>Permissão</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            ${perms.map(p => `
            <tr>
              <td><code>${p.code}</code></td>
              <td><strong>${p.name}</strong></td>
              <td>${p.description}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      `).join('')}

      <div class="alert alert-info">
        <strong>Nota:</strong> Usuários com papel "Admin" possuem automaticamente todas as permissões do sistema, independentemente das atribuições de grupo.
      </div>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 7</span>
      </div>
    </div>
  </div>

  <!-- PÁGINA FINAL -->
  <div class="page">
    <div class="content">
      <div class="header">
        <span class="header-title">Sistema CPQ Pardis - Regras de Negócio</span>
        <span class="header-version">v${version}</span>
      </div>

      <h2>Informações do Documento</h2>

      <table>
        <tbody>
          <tr>
            <td><strong>Versão</strong></td>
            <td>${version}</td>
          </tr>
          <tr>
            <td><strong>Data de Geração</strong></td>
            <td>${generatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
          <tr>
            <td><strong>Módulos Documentados</strong></td>
            <td>Autenticação, Cotações, Cadastros, Gestão de Usuários</td>
          </tr>
        </tbody>
      </table>

      <h3>Controle de Versões</h3>
      <table>
        <thead>
          <tr>
            <th>Versão</th>
            <th>Data</th>
            <th>Alterações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1.0.0</td>
            <td>${generatedAt.toLocaleDateString('pt-BR')}</td>
            <td>Versão inicial - Documentação dos módulos focais</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 60px; text-align: center; color: #666;">
        <p><em>Este documento é gerado automaticamente pelo Sistema CPQ Pardis.</em></p>
        <p><em>Os dados refletem a configuração atual do sistema no momento da geração.</em></p>
      </div>

      <div class="footer">
        <span>Sistema CPQ Pardis - Documento Confidencial</span>
        <span>Página 8</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function exportToPDF(data: DocumentData): void {
  const html = generateBusinessRulesHTML(data);
  
  // Criar uma nova janela para impressão
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Aguardar o carregamento e abrir diálogo de impressão
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
