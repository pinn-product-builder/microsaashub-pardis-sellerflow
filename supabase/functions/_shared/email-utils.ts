const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string[];
    subject: string;
    html: string;
}) {
    if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY não configurada. E-mail não enviado:', { to, subject });
        return { error: 'RESEND_API_KEY_MISSING' };
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: 'Sistema de Cotações <onboarding@resend.dev>', // Idealmente usar domínio verificado
            to,
            subject,
            html,
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        console.error('Erro ao enviar e-mail via Resend:', data);
        throw new Error(`Erro Resend: ${JSON.stringify(data)}`);
    }

    return data;
}

export function getBaseTemplate(title: string, content: string, actionUrl?: string, actionText?: string) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { border-bottom: 2px solid #0056b3; padding-bottom: 10px; margin-bottom: 20px; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #0056b3; 
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 4px; 
          font-weight: bold;
          margin-top: 20px;
        }
        .highlight { color: #0056b3; font-weight: bold; }
        .urgent { color: #d9534f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${title}</h2>
        </div>
        <div class="content">
          ${content}
        </div>
        ${actionUrl ? `<p><a href="${actionUrl}" class="button">${actionText || 'Ver Detalhes'}</a></p>` : ''}
        <div class="footer">
          <p>Este é um e-mail automático do Sistema de Cotações. Por favor, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
