
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Quote } from '@/types/seller-flow';
import { EmailTemplate } from './EmailTemplate';
import { useToast } from '@/hooks/use-toast';
import { Send, FileText } from 'lucide-react';

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
}

export function EmailDialog({ open, onOpenChange, quote }: EmailDialogProps) {
  const { toast } = useToast();
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    subject: `Cotação ${quote.number} - ${quote.customer.companyName}`,
    message: EmailTemplate.getDefaultMessage(quote),
    attachPDF: true,
    attachExcel: false
  });
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!emailData.to.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o destinatário.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    // Simulação de envio de email
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Email Enviado",
        description: `Cotação enviada para ${emailData.to} com sucesso!`
      });
      
      onOpenChange(false);
      
      // Reset form
      setEmailData(prev => ({
        ...prev,
        to: '',
        cc: '',
        message: EmailTemplate.getDefaultMessage(quote)
      }));
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Enviar Cotação por Email
          </DialogTitle>
          <DialogDescription>
            Envie a cotação {quote.number} para o cliente por email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="to">Para *</Label>
              <Input
                id="to"
                type="email"
                placeholder="cliente@email.com"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc">Cópia (CC)</Label>
              <Input
                id="cc"
                type="email"
                placeholder="outros@email.com"
                value={emailData.cc}
                onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              rows={8}
              value={emailData.message}
              onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label>Anexos</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="attachPDF"
                checked={emailData.attachPDF}
                onCheckedChange={(checked) => setEmailData(prev => ({ ...prev, attachPDF: checked }))}
              />
              <Label htmlFor="attachPDF" className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                PDF da Cotação
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="attachExcel"
                checked={emailData.attachExcel}
                onCheckedChange={(checked) => setEmailData(prev => ({ ...prev, attachExcel: checked }))}
              />
              <Label htmlFor="attachExcel" className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Planilha Excel
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
