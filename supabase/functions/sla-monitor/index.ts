import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendEmail, getBaseTemplate } from "../_shared/email-utils.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const now = new Date();
        const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        // 1. Buscar solicitações que expiram em breve (e ainda não foram alertadas)
        const { data: nears } = await supabaseAdmin
            .from('vtex_approval_requests')
            .select(`
        *,
        approval_rules ( approver_role )
      `)
            .eq('status', 'pending')
            .eq('sla_warning_sent', false)
            .lte('expires_at', fourHoursFromNow.toISOString())
            .gt('expires_at', now.toISOString());

        // 2. Buscar solicitações já expiradas
        const { data: expireds } = await supabaseAdmin
            .from('vtex_approval_requests')
            .select(`
        *,
        approval_rules ( approver_role )
      `)
            .eq('status', 'pending')
            .lt('expires_at', now.toISOString());

        console.log(`Monitorando SLA: ${nears?.length || 0} em aviso, ${expireds?.length || 0} expirados.`);

        const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://pardis-sellerflow.vercel.app';

        // Processar avisos (Near Expiry)
        for (const req of nears || []) {
            const role = req.approval_rules?.approver_role || 'aprovador';
            const emails = await getApproverEmails(supabaseAdmin, role);

            if (emails.length > 0) {
                const content = `
          <p>Olá,</p>
          <p>A solicitação de aprovação para a cotação <strong>${req.quote_id}</strong> está <span class="urgent">prestes a expirar</span> (SLA de 4 horas).</p>
          <p><strong>Prazo:</strong> ${new Date(req.expires_at).toLocaleString('pt-BR')}</p>
          <p>Por favor, tome uma ação imediata para evitar atrasos.</p>
        `;
                const html = getBaseTemplate('Aviso de SLA: Expira em breve', content, `${appUrl}/approvals`, 'Ir para Aprovações');

                await sendEmail({ to: emails, subject: `[AVISO] SLA Próximo do Vencimento - Cotação ${req.quote_id}`, html });
                await supabaseAdmin.from('vtex_approval_requests').update({ sla_warning_sent: true }).eq('id', req.id);
            }
        }

        // Processar expirados
        for (const req of expireds || []) {
            const role = req.approval_rules?.approver_role || 'aprovador';
            const emails = await getApproverEmails(supabaseAdmin, role);

            // Só enviar se não notificamos hoje ou algo similar (aqui enviamos sempre que o cron roda se estiver pendente)
            // Idealmente marcar a última notificação para não ser chato
            const lastSent = req.last_notification_sent_at ? new Date(req.last_notification_sent_at) : null;
            const hoursSinceLast = lastSent ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60) : 24;

            if (emails.length > 0 && hoursSinceLast >= 12) {
                const content = `
          <p>Olá,</p>
          <p>A solicitação de aprovação para a cotação <strong>${req.quote_id}</strong> está <span class="urgent">VENCIDA</span>.</p>
          <p>O prazo de SLA (${new Date(req.expires_at).toLocaleString('pt-BR')}) foi ultrapassado.</p>
          <p><strong>Ação imediata requerida.</strong></p>
        `;
                const html = getBaseTemplate('SLA VENCIDO', content, `${appUrl}/approvals`, 'Resolver Agora');

                await sendEmail({ to: emails, subject: `[CRÍTICO] SLA VENCIDO - Cotação ${req.quote_id}`, html });
                await supabaseAdmin.from('vtex_approval_requests').update({ last_notification_sent_at: now.toISOString() }).eq('id', req.id);
            }
        }

        return new Response(JSON.stringify({ success: true, processed: (nears?.length || 0) + (expireds?.length || 0) }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Erro no sla-monitor:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});

async function getApproverEmails(supabase: any, role: string): Promise<string[]> {
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', role);
    if (!roles || roles.length === 0) return [];

    const ids = roles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase.from('profiles').select('email').in('user_id', ids);
    return profiles ? profiles.map((p: any) => p.email) : [];
}
