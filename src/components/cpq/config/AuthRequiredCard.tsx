import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AuthRequiredCard() {
  const navigate = useNavigate();

  return (
    <Card className="border-amber-500/50 bg-amber-50/50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-4 bg-amber-100 rounded-full w-fit">
          <Shield className="h-8 w-8 text-amber-600" />
        </div>
        <CardTitle>Autenticação Necessária</CardTitle>
        <CardDescription>
          Você precisa estar logado para acessar as configurações do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          As configurações de pricing, aprovações e pagamento são restritas a usuários autenticados
          para garantir a segurança e rastreabilidade das alterações.
        </p>
        <Button onClick={() => navigate('/login')} className="gap-2">
          <LogIn className="h-4 w-4" />
          Fazer Login
        </Button>
      </CardContent>
    </Card>
  );
}
