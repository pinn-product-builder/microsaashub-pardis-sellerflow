import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendEmail, getBaseTemplate } from "../_shared/email-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
}

function calculateSLAExpiry(startDate: Date, slaHours: number, businessHours: BusinessHour[]): Date {
  let currentMoment = new Date(startDate);
  let remainingHours = slaHours;

  const getBusinessDay = (date: Date) => businessHours.find(bh => bh.day_of_week === date.getDay());

  // Limite de segurança para evitar loops infinitos caso não haja horários configurados
  let safetyCounter = 0;
  const maxDays = 100;

  while (remainingHours > 0 && safetyCounter < maxDays) {
    const dayConfig = getBusinessDay(currentMoment);

    if (!dayConfig || !dayConfig.is_open) {
      currentMoment.setDate(currentMoment.getDate() + 1);
      currentMoment.setHours(0, 0, 0, 0);
      safetyCounter++;
      continue;
    }

    const [startH, startM] = dayConfig.start_time.split(':').map(Number);
    const [endH, endM] = dayConfig.end_time.split(':').map(Number);

    const openingTime = new Date(currentMoment);
    openingTime.setHours(startH, startM, 0, 0);

    const closingTime = new Date(currentMoment);
    closingTime.setHours(endH, endM, 0, 0);

    if (currentMoment < openingTime) {
      currentMoment = openingTime;
    }

    if (currentMoment >= closingTime) {
      currentMoment.setDate(currentMoment.getDate() + 1);
      currentMoment.setHours(0, 0, 0, 0);
      safetyCounter++;
      continue;
    }

    const hoursLeftInDay = (closingTime.getTime() - currentMoment.getTime()) / (1000 * 60 * 60);

    if (remainingHours <= hoursLeftInDay) {
      currentMoment.setMilliseconds(currentMoment.getMilliseconds() + remainingHours * 3600000);
      remainingHours = 0;
    } else {
      remainingHours -= hoursLeftInDay;
      currentMoment.setDate(currentMoment.getDate() + 1);
      currentMoment.setHours(0, 0, 0, 0);
      safetyCounter++;
    }
  }

  return currentMoment;
}

interface ApprovalRequest {
  action: 'create' | 'approve' | 'reject';
  requestId?: string;
  quoteId?: string;
  reason?: string;
  comments?: string;
  marginPercent?: number;
  totalValue?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user role
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = userRole?.role ?? 'vendedor';

    // Parse request
    const body: ApprovalRequest = await req.json();
    const { action, requestId, quoteId, reason, comments, marginPercent, totalValue } = body;

    // Helper: Determinar passos da regra baseado na margem
    async function getApprovalSteps(margin: number) {
      const { data: rules } = await supabaseAdmin
        .from('approval_rules')
        .select(`
          id, approver_role, sla_hours, priority, margin_min, margin_max,
          approval_rule_steps (*)
        `)
        .eq('is_active', true)
        .order('margin_min', { ascending: true });

      if (!rules) return null;

      // Encontrar a regra que se aplica à margem
      const rule = rules.find(r => margin >= (r.margin_min ?? -100) && margin <= (r.margin_max ?? 100));
      if (!rule) return null;

      // Se não houver steps explícitos, criar um step virtual baseado na regra base
      const steps = rule.approval_rule_steps && rule.approval_rule_steps.length > 0
        ? rule.approval_rule_steps.sort((a: any, b: any) => a.step_order - b.step_order)
        : [{
          approver_role: rule.approver_role,
          step_order: 1,
          sla_hours: rule.sla_hours,
          rule_id: rule.id,
          primary_approver_id: null,
          substitute_approver_id: null
        }];

      return { rule, steps };
    }

    // Helper: Verificar se um usuário está ausente
    async function isUserAbsent(userId: string): Promise<boolean> {
      if (!userId) return false;
      const now = new Date().toISOString();
      const { data: absence } = await supabaseAdmin
        .from('user_absences')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .maybeSingle();

      return !!absence;
    }

    // Helper: Determinar o aprovador efetivo baseado em ausência
    async function getEffectiveApprover(step: any): Promise<{ userId: string | null; isRedirected: boolean; redirectedFrom: string | null }> {
      const primaryId = step.primary_approver_id;
      const substituteId = step.substitute_approver_id;

      if (!primaryId) {
        return { userId: null, isRedirected: false, redirectedFrom: null };
      }

      const absent = await isUserAbsent(primaryId);
      if (absent && substituteId) {
        return { userId: substituteId, isRedirected: true, redirectedFrom: primaryId };
      }

      return { userId: primaryId, isRedirected: false, redirectedFrom: null };
    }

    // Helper: Notificar aprovadores
    async function notifyApprovers(quoteId: string, role: string, margin: number, total: number, specificUserId?: string | null) {
      // 1. Buscar emails de usuários alvos
      let query = supabaseAdmin.from('profiles').select('email, full_name');

      if (specificUserId) {
        query = query.eq('user_id', specificUserId);
      } else {
        query = query.in('user_id', (
          await supabaseAdmin
            .from('user_roles')
            .select('user_id')
            .eq('role', role)
        ).data?.map(r => r.user_id) || []);
      }

      const { data: approvers } = await query;

      if (!approvers || approvers.length === 0) {
        console.warn(`Nenhum aprovador encontrado para a role: ${role}`);
        return;
      }

      const emails = approvers.map(a => a.email);
      const subject = `[PENDENTE] Nova Aprovação de Cotação - Margem ${margin.toFixed(2)}%`;

      const content = `
        <p>Olá,</p>
        <p>Uma nova cotação requer sua aprovação.</p>
        <ul>
          <li><strong>ID da Cotação:</strong> ${quoteId}</li>
          <li><strong>Valor Total:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
          <li><strong>Margem:</strong> <span class="highlight">${margin.toFixed(2)}%</span></li>
          <li><strong>Papel Necessário:</strong> ${role.toUpperCase()}</li>
        </ul>
        <p>Por favor, acesse o painel de aprovações para tomar uma decisão.</p>
      `;

      // Idealmente passar a URL real do sistema
      const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://pardis-sellerflow.vercel.app';
      const actionUrl = `${appUrl}/approvals`;

      const html = getBaseTemplate('Nova Solicitação de Aprovação', content, actionUrl, 'Ver Solicitações');

      try {
        await sendEmail({ to: emails, subject, html });
        console.log(`Notificação enviada para ${emails.length} aprovadores (${role})`);
      } catch (err) {
        console.error('Falha ao enviar e-mail de notificação:', err);
      }
    }

    if (action === 'create') {
      if (!quoteId || marginPercent === undefined || totalValue === undefined) {
        return new Response(JSON.stringify({ error: 'Parâmetros ausentes' }), { status: 400, headers: corsHeaders });
      }

      const flow = await getApprovalSteps(marginPercent);
      if (!flow) {
        return new Response(JSON.stringify({ error: 'Nenhuma regra de aprovação encontrada para esta margem' }), { status: 404, headers: corsHeaders });
      }

      const firstStep = flow.steps[0];
      const effective = await getEffectiveApprover(firstStep);

      // Fetch business hours para o SLA
      const { data: businessHours } = await supabaseAdmin.from('vtex_business_hours').select('*');
      const expiresAt = calculateSLAExpiry(new Date(), firstStep.sla_hours ?? 24, businessHours || []);

      const { data: approvalRequest, error: createError } = await supabaseAdmin
        .from('vtex_approval_requests')
        .insert({
          quote_id: quoteId,
          requested_by: user.id,
          reason: reason ?? `Margem de ${marginPercent.toFixed(2)}% requer aprovação (${flow.rule.name})`,
          quote_total: totalValue,
          quote_margin_percent: marginPercent,
          status: 'pending',
          priority: flow.rule.priority || 'medium',
          rule_id: flow.rule.id,
          current_step_order: 1,
          total_steps: flow.steps.length,
          expires_at: expiresAt.toISOString(),
          is_redirected: effective.isRedirected,
          redirected_from_user_id: effective.redirectedFrom,
          assigned_to_user_id: effective.userId // Assumindo que vamos usar esta coluna para atribuir a um usuário específico
        })
        .select()
        .single();

      if (createError) throw createError;

      // Bloquear cotação
      await supabaseAdmin.from('vtex_quotes').update({ status: 'pending_approval', requires_approval: true }).eq('id', quoteId);

      // Notificar primeiro nível
      await notifyApprovers(quoteId, firstStep.approver_role, marginPercent, totalValue, effective.userId);

      return new Response(JSON.stringify({ success: true, approvalRequest, currentStep: firstStep, redirected: effective.isRedirected }), { status: 201, headers: corsHeaders });
    }

    if (action === 'approve' || action === 'reject') {
      if (!requestId) return new Response(JSON.stringify({ error: 'requestId ausente' }), { status: 400, headers: corsHeaders });

      const { data: currentReq, error: fetchError } = await supabaseAdmin
        .from('vtex_approval_requests')
        .select(`
          *,
          approval_rules (
            *,
            approval_rule_steps (*)
          )
        `)
        .eq('id', requestId)
        .single();

      if (fetchError || !currentReq) throw new Error('Solicitação não encontrada');
      if (currentReq.status !== 'pending') throw new Error('Solicitação já processada');

      // Validar permissão (quem está aprovando tem a role do step atual ou superior?)
      // Buscamos o papel necessário para este passo específico
      const flowSteps = currentReq.approval_rules?.approval_rule_steps || [];
      const currentStepConfig = flowSteps.find((s: any) => s.step_order === currentReq.current_step_order)
        || { approver_role: currentReq.approval_rules?.approver_role };

      const { data: canApprove } = await supabaseAdmin.rpc('can_approve', {
        _user_id: user.id,
        _required_role: currentStepConfig.approver_role
      });

      if (!canApprove) return new Response(JSON.stringify({ error: 'Permissao negada' }), { status: 403, headers: corsHeaders });

      if (action === 'reject') {
        await supabaseAdmin.from('vtex_approval_requests').update({ status: 'rejected', approved_by: user.id, decided_at: new Date().toISOString(), comments }).eq('id', requestId);
        await supabaseAdmin.from('vtex_quotes').update({ status: 'rejected', is_authorized: false }).eq('id', currentReq.quote_id);
        return new Response(JSON.stringify({ success: true, status: 'rejected' }), { status: 200, headers: corsHeaders });
      }

      // Ação: APPROVE
      // 1. Marcar atual como aprovada
      await supabaseAdmin.from('vtex_approval_requests').update({
        status: 'approved',
        approved_by: user.id,
        decided_at: new Date().toISOString(),
        comments
      }).eq('id', requestId);

      // 2. Verificar se existe um próximo passo
      const nextStep = flowSteps.find((s: any) => s.step_order === currentReq.current_step_order + 1);

      if (nextStep) {
        // Verificar redirecionamento por ausência no próximo passo
        const effectiveNext = await getEffectiveApprover(nextStep);

        // Criar próxima solicitação na cadeia
        const { data: businessHours } = await supabaseAdmin.from('vtex_business_hours').select('*');
        const expiresAt = calculateSLAExpiry(new Date(), nextStep.sla_hours ?? 24, businessHours || []);

        await supabaseAdmin.from('vtex_approval_requests').insert({
          quote_id: currentReq.quote_id,
          requested_by: currentReq.requested_by,
          reason: currentReq.reason,
          quote_total: currentReq.quote_total,
          quote_margin_percent: currentReq.quote_margin_percent,
          status: 'pending',
          priority: currentReq.priority,
          rule_id: currentReq.rule_id,
          current_step_order: nextStep.step_order,
          total_steps: currentReq.total_steps,
          parent_request_id: currentReq.id,
          expires_at: expiresAt.toISOString(),
          is_redirected: effectiveNext.isRedirected,
          redirected_from_user_id: effectiveNext.redirectedFrom,
          assigned_to_user_id: effectiveNext.userId
        });

        // Notificar próximo nível
        await notifyApprovers(currentReq.quote_id, nextStep.approver_role, currentReq.quote_margin_percent, currentReq.quote_total, effectiveNext.userId);

        return new Response(JSON.stringify({
          success: true,
          status: 'escalated',
          nextStep: nextStep.approver_role,
          redirected: effectiveNext.isRedirected
        }), { status: 200, headers: corsHeaders });
      } else {
        // Fim da linha: Aprovação total!
        await supabaseAdmin.from('vtex_quotes').update({
          status: 'approved',
          is_authorized: true,
          updated_at: new Date().toISOString()
        }).eq('id', currentReq.quote_id);

        return new Response(JSON.stringify({ success: true, status: 'approved' }), { status: 200, headers: corsHeaders });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida. Use: create, approve, ou reject' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-approval:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno no servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
