import { supabase } from '@/integrations/supabase/client';
import type { QuoteAttachment, AttachmentUploadPayload, AttachmentUploadResponse } from '@/types/attachments';

const BUCKET_NAME = 'quote-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * SERVIÇO: Gerenciamento de Anexos de Cotação
 * Responsável por upload, listagem e remoção de documentos comprobatórios.
 */
export class AttachmentService {
    /**
     * Faz upload de um arquivo para o bucket de anexos
     */
    static async uploadFile(payload: AttachmentUploadPayload): Promise<AttachmentUploadResponse> {
        const { quoteId, file, description } = payload;

        // Validações
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`Arquivo muito grande. Tamanho máximo: 10MB`);
        }

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Tipo de arquivo não permitido. Use PDF ou XLSX.');
        }

        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${quoteId}/${timestamp}_${sanitizedName}`;

        // Upload para o Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            throw new Error(`Erro no upload: ${uploadError.message}`);
        }

        // Obter URL pública (assinada)
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        // Determinar tipo do arquivo
        let fileType: 'pdf' | 'xlsx' | 'other' = 'other';
        if (file.type === 'application/pdf') fileType = 'pdf';
        else if (file.type.includes('spreadsheet') || file.type.includes('excel')) fileType = 'xlsx';

        // Registrar no banco de dados
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Usuário não autenticado');

        const { data: attachment, error: dbError } = await supabase
            .from('vtex_quote_attachments')
            .insert({
                quote_id: quoteId,
                file_name: file.name,
                file_type: fileType,
                file_url: uploadData.path,
                file_size: file.size,
                uploaded_by: userData.user.id,
                description: description || null
            })
            .select()
            .single();

        if (dbError) {
            // Rollback: deletar arquivo do storage
            await supabase.storage.from(BUCKET_NAME).remove([filePath]);
            throw new Error(`Erro ao registrar anexo: ${dbError.message}`);
        }

        return {
            attachment: attachment as QuoteAttachment,
            publicUrl: urlData.publicUrl
        };
    }

    /**
     * Lista todos os anexos de uma cotação
     */
    static async listAttachments(quoteId: string): Promise<QuoteAttachment[]> {
        const { data, error } = await supabase
            .rpc('get_quote_attachments', { p_quote_id: quoteId });

        if (error) {
            throw new Error(`Erro ao listar anexos: ${error.message}`);
        }

        return (data || []) as QuoteAttachment[];
    }

    /**
     * Remove um anexo (arquivo + registro no banco)
     */
    static async deleteAttachment(attachmentId: string): Promise<void> {
        // Buscar informações do anexo
        const { data: attachment, error: fetchError } = await supabase
            .from('vtex_quote_attachments')
            .select('file_url')
            .eq('id', attachmentId)
            .single();

        if (fetchError) {
            throw new Error(`Anexo não encontrado: ${fetchError.message}`);
        }

        // Deletar do storage
        const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([attachment.file_url]);

        if (storageError) {
            console.error('Erro ao deletar arquivo do storage:', storageError);
            // Continua mesmo com erro no storage (pode já ter sido deletado)
        }

        // Deletar do banco
        const { error: dbError } = await supabase
            .from('vtex_quote_attachments')
            .delete()
            .eq('id', attachmentId);

        if (dbError) {
            throw new Error(`Erro ao deletar anexo: ${dbError.message}`);
        }
    }

    /**
     * Gera URL assinada para download (válida por 1 hora)
     */
    static async getDownloadUrl(filePath: string): Promise<string> {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, 3600); // 1 hora

        if (error) {
            throw new Error(`Erro ao gerar URL de download: ${error.message}`);
        }

        return data.signedUrl;
    }

    /**
     * Valida se um arquivo pode ser anexado
     */
    static validateFile(file: File): { valid: boolean; error?: string } {
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: 'Arquivo muito grande (máx 10MB)' };
        }

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Apenas arquivos PDF e XLSX são permitidos' };
        }

        return { valid: true };
    }
}
