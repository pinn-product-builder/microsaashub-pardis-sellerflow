import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    if (action === 'create') {
      // Validate input
      if (!quoteId || marginPercent === undefined || totalValue === undefined) {
        return new Response(
          JSON.stringify({ error: 'Parâmetros obrigatórios: quoteId, marginPercent, totalValue' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch quote
      const { data: quote, error: quoteError } = await supabaseClient
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: 'Cotação não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine required approver based on margin
      const { data: approvalRules } = await supabaseAdmin
        .from('approval_rules')
        .select('*')
        .eq('is_active', true)
        .order('margin_min', { ascending: true });

      let requiredRole = 'gerente';
      let priority = 'medium';
      let ruleId = null;
      let slaHours = 24;

      if (approvalRules) {
        for (const rule of approvalRules) {
          if (marginPercent >= (rule.margin_min ?? 0) && marginPercent <= (rule.margin_max ?? 100)) {
            requiredRole = rule.approver_role;
            priority = rule.priority ?? 'medium';
            ruleId = rule.id;
            slaHours = rule.sla_hours ?? 24;
            break;
          }
        }
      }

      // Fetch business hours
      const { data: businessHours } = await supabaseAdmin
        .from('vtex_business_hours')
        .select('*');

      // Calculate expiry
      let expiresAt: Date;
      if (businessHours && businessHours.length > 0) {
        expiresAt = calculateSLAExpiry(new Date(), slaHours, businessHours);
      } else {
        // Fallback para SLA corrido caso não haja configuração
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + slaHours);
      }

      // Create approval request
      const { data: approvalRequest, error: createError } = await supabaseAdmin
        .from('approval_requests')
        .insert({
          quote_id: quoteId,
          requested_by: user.id,
          reason: reason ?? `Margem de ${marginPercent.toFixed(2)}% requer aprovação`,
          quote_total: totalValue,
          quote_margin_percent: marginPercent,
          status: 'pending',
          priority,
          rule_id: ruleId,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao criar solicitação', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update quote status
      await supabaseAdmin
        .from('quotes')
        .update({
          status: 'pending_approval',
          requires_approval: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      // Log audit
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE_APPROVAL_REQUEST',
        entity_type: 'approval_request',
        entity_id: approvalRequest.id,
        new_values: {
          quoteId,
          marginPercent,
          totalValue,
          requiredRole,
          priority
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          approvalRequest,
          requiredRole,
          expiresAt: expiresAt.toISOString()
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'approve' || action === 'reject') {
      if (!requestId) {
        return new Response(
          JSON.stringify({ error: 'Parâmetro obrigatório: requestId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch approval request
      const { data: approvalReq, error: fetchError } = await supabaseAdmin
        .from('approval_requests')
        .select('*, approval_rules(approver_role)')
        .eq('id', requestId)
        .single();

      if (fetchError || !approvalReq) {
        return new Response(
          JSON.stringify({ error: 'Solicitação não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (approvalReq.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Solicitação já processada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user can approve
      const requiredRole = approvalReq.approval_rules?.approver_role ?? 'gerente';
      const { data: canApprove } = await supabaseAdmin
        .rpc('can_approve', { _user_id: user.id, _required_role: requiredRole });

      if (!canApprove) {
        return new Response(
          JSON.stringify({
            error: 'Permissão negada',
            details: `Apenas ${requiredRole} ou superior pode processar esta solicitação`
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rejection requires comments
      if (action === 'reject' && !comments) {
        return new Response(
          JSON.stringify({ error: 'Comentário obrigatório para rejeição' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update approval request
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { error: updateError } = await supabaseAdmin
        .from('approval_requests')
        .update({
          status: newStatus,
          approved_by: user.id,
          comments: comments ?? null,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar solicitação', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update quote status
      const quoteStatus = action === 'approve' ? 'approved' : 'rejected';
      await supabaseAdmin
        .from('quotes')
        .update({
          status: quoteStatus,
          is_authorized: action === 'approve',
          updated_at: new Date().toISOString()
        })
        .eq('id', approvalReq.quote_id);

      // Log audit
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: action === 'approve' ? 'APPROVE_REQUEST' : 'REJECT_REQUEST',
        entity_type: 'approval_request',
        entity_id: requestId,
        old_values: { status: 'pending' },
        new_values: {
          status: newStatus,
          comments,
          quoteId: approvalReq.quote_id
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          status: newStatus,
          quoteId: approvalReq.quote_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
