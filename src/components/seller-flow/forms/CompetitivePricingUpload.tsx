import { useState, useCallback } from 'react';
import { Upload, FileText, X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AttachmentService } from '@/services/attachmentService';
import type { QuoteAttachment } from '@/types/attachments';

interface CompetitivePricingUploadProps {
    quoteId: string;
    attachments: QuoteAttachment[];
    onAttachmentsChange: () => void;
}

/**
 * COMPONENTE: Upload de Documentos Comprobatórios
 * Permite anexar PDFs e planilhas que comprovem preços da concorrência.
 */
export function CompetitivePricingUpload({
    quoteId,
    attachments,
    onAttachmentsChange
}: CompetitivePricingUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { toast } = useToast();

    const handleFileSelect = async (file: File) => {
        // Validação
        const validation = AttachmentService.validateFile(file);
        if (!validation.valid) {
            toast({
                title: "Arquivo inválido",
                description: validation.error,
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);
        try {
            await AttachmentService.uploadFile({
                quoteId,
                file,
                description: `Documento comprobatório: ${file.name}`
            });

            toast({
                title: "Upload concluído",
                description: `${file.name} foi anexado com sucesso.`
            });

            onAttachmentsChange();
        } catch (error: any) {
            toast({
                title: "Erro no upload",
                description: error.message || "Não foi possível fazer o upload do arquivo.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [quoteId]);

    const handleDelete = async (attachmentId: string) => {
        try {
            await AttachmentService.deleteAttachment(attachmentId);
            toast({
                title: "Anexo removido",
                description: "O documento foi excluído com sucesso."
            });
            onAttachmentsChange();
        } catch (error: any) {
            toast({
                title: "Erro ao remover",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleDownload = async (attachment: QuoteAttachment) => {
        try {
            const url = await AttachmentService.getDownloadUrl(attachment.file_url);
            window.open(url, '_blank');
        } catch (error: any) {
            toast({
                title: "Erro no download",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos Comprobatórios
                </CardTitle>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                    Anexe PDFs ou planilhas que comprovem preços da concorrência (máx 10MB)
                </p>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* IDENTIFICAÇÃO: ÁREA DE UPLOAD (DRAG & DROP) */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-all
            ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted-foreground/20 hover:border-primary/40'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            <p className="text-sm font-bold text-primary">Fazendo upload...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <Upload className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-700">
                                    Arraste um arquivo ou{' '}
                                    <label className="text-primary underline cursor-pointer hover:text-primary/80">
                                        clique para selecionar
                                        <input
                                            type="file"
                                            accept=".pdf,.xlsx,.xls"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileSelect(file);
                                            }}
                                        />
                                    </label>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Formatos: PDF, XLSX • Tamanho máximo: 10MB
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* IDENTIFICAÇÃO: LISTA DE ANEXOS */}
                {attachments.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Arquivos Anexados ({attachments.length})
                        </Label>
                        <div className="space-y-2">
                            {attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-muted-foreground/10 hover:bg-muted/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2 bg-primary/10 rounded">
                                            <FileText className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-800 truncate">
                                                {attachment.file_name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="secondary" className="text-[9px] font-black uppercase px-1.5 h-4">
                                                    {attachment.file_type}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {formatFileSize(attachment.file_size)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleDownload(attachment)}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(attachment.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
