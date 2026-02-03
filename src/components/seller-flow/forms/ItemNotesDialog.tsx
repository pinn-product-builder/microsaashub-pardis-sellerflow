import { useState } from 'react';
import { MessageSquare, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ItemNotesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemName: string;
    currentNotes: string;
    onSave: (notes: string) => void;
}

/**
 * COMPONENTE: Dialog de Notas por Item
 * Permite adicionar observações específicas para cada produto da cotação.
 */
export function ItemNotesDialog({
    open,
    onOpenChange,
    itemName,
    currentNotes,
    onSave
}: ItemNotesDialogProps) {
    const [notes, setNotes] = useState(currentNotes);
    const maxChars = 500;

    const handleSave = () => {
        onSave(notes.trim());
        onOpenChange(false);
    };

    const handleClose = () => {
        setNotes(currentNotes); // Reset ao fechar sem salvar
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Observações do Item
                    </DialogTitle>
                    <DialogDescription className="font-medium">
                        Adicione notas específicas para: <span className="font-bold text-primary">{itemName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="item-notes" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Observações
                        </Label>
                        <Textarea
                            id="item-notes"
                            placeholder="Ex: 'Concorrente ofereceu R$ 150,00', 'Cliente solicitou embalagem especial', 'Prazo de entrega crítico'..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value.slice(0, maxChars))}
                            className="min-h-[150px] resize-none shadow-inner border-muted-foreground/20 focus-visible:ring-primary/20"
                        />
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">
                                Use este campo para registrar informações relevantes sobre este item específico.
                            </span>
                            <span className={`font-mono font-bold ${notes.length > maxChars * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {notes.length}/{maxChars}
                            </span>
                        </div>
                    </div>

                    {/* IDENTIFICAÇÃO: DICAS DE USO */}
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-primary">💡 Sugestões de Uso</p>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                            <li>Preços praticados pela concorrência</li>
                            <li>Condições especiais solicitadas pelo cliente</li>
                            <li>Justificativas para descontos ou margens reduzidas</li>
                            <li>Observações sobre estoque, prazo ou logística</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={handleClose} className="font-bold">
                        CANCELAR
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-primary hover:bg-primary/90 font-black px-6 shadow-lg shadow-primary/20"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        SALVAR OBSERVAÇÕES
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
