import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  X, 
  Power, 
  PowerOff, 
  Sparkles, 
  Trash2,
  CheckSquare
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

  const handleApplyCampaign = () => {
    if (!campaignName.trim()) return;
    onApplyCampaign(campaignName.trim(), campaignDiscount);
    setShowCampaignDialog(false);
    setCampaignName('');
    setCampaignDiscount(0);
  };

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
            onClick={onActivate}
            disabled={isLoading}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Power className="h-4 w-4 mr-1" />
            Ativar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
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
            onClick={onRemoveCampaign}
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