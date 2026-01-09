import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  X, 
  Power, 
  PowerOff, 
  Sparkles, 
  Trash2,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onApplyCampaign: (campaignName: string, campaignDiscount: number) => void;
  onRemoveCampaign: () => void;
  isLoading?: boolean;
}

type ConfirmAction = 'activate' | 'deactivate' | 'removeCampaign' | null;

export function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onActivate,
  onDeactivate,
  onApplyCampaign,
  onRemoveCampaign,
  isLoading = false,
}: BatchActionsBarProps) {
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDiscount, setCampaignDiscount] = useState<number>(0);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const handleApplyCampaign = () => {
    if (!campaignName.trim()) return;
    onApplyCampaign(campaignName.trim(), campaignDiscount);
    setShowCampaignDialog(false);
    setCampaignName('');
    setCampaignDiscount(0);
  };

  const handleConfirmAction = () => {
    switch (confirmAction) {
      case 'activate':
        onActivate();
        break;
      case 'deactivate':
        onDeactivate();
        break;
      case 'removeCampaign':
        onRemoveCampaign();
        break;
    }
    setConfirmAction(null);
  };

  const getConfirmationDetails = () => {
    switch (confirmAction) {
      case 'activate':
        return {
          title: 'Ativar Produtos',
          description: `Tem certeza que deseja ativar ${selectedCount} produto${selectedCount > 1 ? 's' : ''}? Esta ação tornará os produtos disponíveis para venda.`,
          actionLabel: 'Ativar',
          actionClass: 'bg-green-600 hover:bg-green-700'
        };
      case 'deactivate':
        return {
          title: 'Desativar Produtos',
          description: `Tem certeza que deseja desativar ${selectedCount} produto${selectedCount > 1 ? 's' : ''}? Esta ação bloqueará os produtos para venda.`,
          actionLabel: 'Desativar',
          actionClass: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'removeCampaign':
        return {
          title: 'Remover Campanha',
          description: `Tem certeza que deseja remover a campanha de ${selectedCount} produto${selectedCount > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
          actionLabel: 'Remover Campanha',
          actionClass: 'bg-red-600 hover:bg-red-700'
        };
      default:
        return null;
    }
  };

  const confirmDetails = getConfirmationDetails();

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-background border shadow-lg rounded-lg px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <span className="font-medium">{selectedCount} produto{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}</span>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction('activate')}
            disabled={isLoading}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Power className="h-4 w-4 mr-1" />
            Ativar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction('deactivate')}
            disabled={isLoading}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <PowerOff className="h-4 w-4 mr-1" />
            Desativar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCampaignDialog(true)}
            disabled={isLoading}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Aplicar Campanha
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction('removeCampaign')}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remover Campanha
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmDetails?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDetails?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmDetails?.actionClass}
            >
              {confirmDetails?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Aplicar Campanha
            </DialogTitle>
            <DialogDescription>
              Esta campanha será aplicada a {selectedCount} produto{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Campanha</label>
              <Input
                placeholder="Ex: Black Friday, Verão 2024..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Desconto (%)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
                value={campaignDiscount || ''}
                onChange={(e) => setCampaignDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApplyCampaign}
              disabled={!campaignName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Aplicar em {selectedCount} produto{selectedCount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}