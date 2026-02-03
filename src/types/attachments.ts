// =============================================================================
// TIPOS DE ANEXOS DE COTAÇÃO
// Gerenciamento de documentos comprobatórios (PDF, XLSX, Sheets)
// =============================================================================

export type AttachmentFileType = 'pdf' | 'xlsx' | 'sheets' | 'other';

/**
 * Anexo de Cotação - Documento comprobatório de preço da concorrência
 */
export interface QuoteAttachment {
    id: string;
    quote_id: string;
    file_name: string;
    file_type: AttachmentFileType;
    file_url: string;
    file_size: number; // bytes
    uploaded_by: string;
    uploaded_at: string;
    description?: string;
}

/**
 * Payload para upload de anexo
 */
export interface AttachmentUploadPayload {
    quoteId: string;
    file: File;
    description?: string;
}

/**
 * Resposta de upload de anexo
 */
export interface AttachmentUploadResponse {
    attachment: QuoteAttachment;
    publicUrl: string;
}
