import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Warehouse, 
  InventoryItem, 
  StockMovement, 
  StockAlert,
  ReorderRule 
} from '@/types/inventory';
import { inventoryService } from '@/services/inventoryService';

interface InventoryState {
  // Data
  warehouses: Warehouse[];
  items: InventoryItem[];
  movements: StockMovement[];
  alerts: StockAlert[];
  reorderRules: ReorderRule[];
  
  // UI State
  loading: boolean;
  error: string | null;
  selectedWarehouse: string | null;
  
  // Actions
  loadWarehouses: () => Promise<void>;
  loadItems: (filters?: any) => Promise<void>;
  loadMovements: (filters?: any) => Promise<void>;
  loadAlerts: (acknowledged?: boolean) => Promise<void>;
  
  addMovement: (movement: Omit<StockMovement, 'id'>) => Promise<void>;
  reserveStock: (productId: string, quantity: number, warehouseId: string, referenceId: string) => Promise<boolean>;
  releaseReservation: (productId: string, quantity: number, warehouseId: string, referenceId: string) => Promise<boolean>;
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => Promise<void>;
  
  setSelectedWarehouse: (warehouseId: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      // Initial state
      warehouses: [],
      items: [],
      movements: [],
      alerts: [],
      reorderRules: [],
      loading: false,
      error: null,
      selectedWarehouse: null,

      // Actions
      loadWarehouses: async () => {
        try {
          set({ loading: true, error: null });
          const warehouses = await inventoryService.listWarehouses();
          set({ warehouses, loading: false });
        } catch (error) {
          set({ error: 'Erro ao carregar depósitos', loading: false });
        }
      },

      loadItems: async (filters) => {
        try {
          set({ loading: true, error: null });
          const items = await inventoryService.listItems(filters);
          set({ items, loading: false });
        } catch (error) {
          set({ error: 'Erro ao carregar itens', loading: false });
        }
      },

      loadMovements: async (filters) => {
        try {
          set({ loading: true, error: null });
          const movements = await inventoryService.getMovements(filters);
          set({ movements, loading: false });
        } catch (error) {
          set({ error: 'Erro ao carregar movimentações', loading: false });
        }
      },

      loadAlerts: async (acknowledged) => {
        try {
          set({ loading: true, error: null });
          const alerts = await inventoryService.getAlerts(acknowledged);
          set({ alerts, loading: false });
        } catch (error) {
          set({ error: 'Erro ao carregar alertas', loading: false });
        }
      },

      addMovement: async (movement) => {
        try {
          set({ loading: true, error: null });
          const newMovement = await inventoryService.registerMovement(movement);
          const { movements } = get();
          set({ 
            movements: [newMovement, ...movements],
            loading: false 
          });
          
          // Reload items to reflect stock changes
          await get().loadItems();
        } catch (error) {
          set({ error: 'Erro ao registrar movimentação', loading: false });
        }
      },

      reserveStock: async (productId, quantity, warehouseId, referenceId) => {
        try {
          set({ loading: true, error: null });
          const success = await inventoryService.reserveStock(
            productId, 
            quantity, 
            warehouseId, 
            referenceId
          );
          
          if (success) {
            // Reload items and movements to reflect changes
            await get().loadItems();
            await get().loadMovements({ limit: 20 });
          }
          
          set({ loading: false });
          return success;
        } catch (error) {
          set({ error: 'Erro ao reservar estoque', loading: false });
          return false;
        }
      },

      releaseReservation: async (productId, quantity, warehouseId, referenceId) => {
        try {
          set({ loading: true, error: null });
          const success = await inventoryService.releaseReservation(
            productId, 
            quantity, 
            warehouseId, 
            referenceId
          );
          
          if (success) {
            // Reload items and movements to reflect changes
            await get().loadItems();
            await get().loadMovements({ limit: 20 });
          }
          
          set({ loading: false });
          return success;
        } catch (error) {
          set({ error: 'Erro ao liberar reserva', loading: false });
          return false;
        }
      },

      acknowledgeAlert: async (alertId, acknowledgedBy) => {
        try {
          set({ loading: true, error: null });
          await inventoryService.acknowledgeAlert(alertId, acknowledgedBy);
          
          // Update the alert in the state
          const { alerts } = get();
          const updatedAlerts = alerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, acknowledgedAt: new Date(), acknowledgedBy }
              : alert
          );
          
          set({ alerts: updatedAlerts, loading: false });
        } catch (error) {
          set({ error: 'Erro ao reconhecer alerta', loading: false });
        }
      },

      setSelectedWarehouse: (warehouseId) => {
        set({ selectedWarehouse: warehouseId });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'inventory-store',
      partialize: (state) => ({
        selectedWarehouse: state.selectedWarehouse,
      }),
    }
  )
);