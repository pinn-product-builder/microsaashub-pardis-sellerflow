
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table } from 'lucide-react';
import { Quote } from '@/types/cpq';
import { PDFGenerator } from './PDFGenerator';
import { ExcelExport } from './ExcelExport';
import { useToast } from '@/hooks/use-toast';

interface ExportActionsProps {
  quote: Quote;
}

export function ExportActions({ quote }: ExportActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handlePDFExport = async () => {
    setIsGenerating(true);
    try {
      await PDFGenerator.generateQuotePDF(quote);
      toast({
        title: "PDF Gerado",
        description: "O PDF da cotação foi gerado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcelExport = async () => {
    setIsGenerating(true);
    try {
      ExcelExport.exportQuoteToExcel(quote);
      toast({
        title: "Excel Exportado",
        description: "A planilha foi exportada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar para Excel.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isGenerating}>
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? 'Gerando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePDFExport}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcelExport}>
          <Table className="mr-2 h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
