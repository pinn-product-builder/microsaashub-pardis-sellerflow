
import { VTEXConfig, VTEXOrder, VTEXIntegrationLog, VTEXIntegrationSettings } from '@/types/vtex';
import { Quote } from '@/types/cpq';

const STORAGE_KEY_SETTINGS = 'vtex_integration_settings';
const STORAGE_KEY_LOGS = 'vtex_integration_logs';

export class VTEXService {
  private static getSettings(): VTEXIntegrationSettings | null {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return stored ? JSON.parse(stored) : null;
  }

  private static saveSettings(settings: VTEXIntegrationSettings): void {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  private static getLogs(): VTEXIntegrationLog[] {
    const stored = localStorage.getItem(STORAGE_KEY_LOGS);
    return stored ? JSON.parse(stored) : [];
  }

  private static saveLogs(logs: VTEXIntegrationLog[]): void {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }

  private static addLog(log: Omit<VTEXIntegrationLog, 'id' | 'createdAt' | 'updatedAt'>): VTEXIntegrationLog {
    const logs = this.getLogs();
    const newLog: VTEXIntegrationLog = {
      ...log,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    logs.push(newLog);
    this.saveLogs(logs);
    return newLog;
  }

  static createSettings(config: VTEXConfig, defaultSettings: Partial<VTEXIntegrationSettings>): VTEXIntegrationSettings {
    const settings: VTEXIntegrationSettings = {
      id: crypto.randomUUID(),
      isEnabled: true,
      config,
      defaultSalesChannel: '1',
      defaultAffiliate: 'CPQ',
      defaultSeller: '1',
      productMapping: {},
      approvalRules: [],
      validationRules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...defaultSettings
    };

    this.saveSettings(settings);
    return settings;
  }

  static updateSettings(updates: Partial<VTEXIntegrationSettings>): VTEXIntegrationSettings | null {
    const settings = this.getSettings();
    if (!settings) return null;

    const updatedSettings = {
      ...settings,
      ...updates,
      updatedAt: new Date()
    };

    this.saveSettings(updatedSettings);
    return updatedSettings;
  }

  static async testConnection(config: VTEXConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!config.accountName || !config.appKey || !config.appToken) {
        return { success: false, message: 'Configurações incompletas' };
      }

      // Em implementação real, faria uma chamada para a API da VTEX
      return { success: true, message: 'Conexão estabelecida com sucesso' };
    } catch (error) {
      return { success: false, message: 'Erro ao conectar com VTEX' };
    }
  }

  static convertQuoteToVTEXOrder(quote: Quote): VTEXOrder {
    const settings = this.getSettings();
    if (!settings) {
      throw new Error('Configurações VTEX não encontradas');
    }

    const order: VTEXOrder = {
      origin: 'CPQ',
      affiliate: settings.defaultAffiliate,
      salesChannel: settings.defaultSalesChannel,
      value: quote.total * 100, // VTEX usa centavos
      totals: [
        { id: 'Items', name: 'Total dos Itens', value: quote.subtotal * 100 },
        { id: 'Discounts', name: 'Descontos', value: -quote.discount * 100 },
        { id: 'Shipping', name: 'Frete', value: quote.totalFreight * 100 },
        { id: 'Tax', name: 'Impostos', value: quote.totalTaxes * 100 }
      ],
      items: quote.items.map((item, index) => ({
        id: settings.productMapping[item.product.id] || item.product.sku,
        quantity: item.quantity,
        seller: settings.defaultSeller,
        price: item.unitPrice * 100,
        listPrice: item.unitPrice * 100,
        measurementUnit: 'un',
        unitMultiplier: 1
      })),
      clientProfileData: {
        email: `${quote.customer.cnpj.replace(/\D/g, '')}@empresa.com`,
        firstName: quote.customer.companyName.split(' ')[0],
        lastName: quote.customer.companyName.split(' ').slice(1).join(' ') || 'Ltda',
        documentType: 'cnpj',
        document: quote.customer.cnpj.replace(/\D/g, ''),
        phone: '+5511999999999',
        corporateName: quote.customer.companyName,
        tradeName: quote.customer.companyName,
        corporateDocument: quote.customer.cnpj.replace(/\D/g, ''),
        isCorporate: true
      },
      shippingData: {
        address: {
          addressType: 'commercial',
          receiverName: quote.customer.companyName,
          postalCode: '01000-000',
          city: quote.customer.city,
          state: quote.customer.uf,
          country: 'BRA',
          street: 'Rua Principal',
          number: '123',
          neighborhood: 'Centro'
        },
        logisticsInfo: quote.items.map((item, index) => ({
          itemIndex: index,
          selectedSla: 'Normal',
          lockTTL: '10d',
          price: item.freight * 100,
          listPrice: item.freight * 100,
          sellingPrice: item.freight * 100,
          deliveryCompany: 'Transportadora',
          shippingEstimate: '5bd',
          shippingEstimateDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          slas: [{
            id: 'Normal',
            name: 'Entrega Normal',
            shippingEstimate: '5bd',
            price: item.freight * 100,
            availableDeliveryWindows: [],
            pickupStoreInfo: {
              isPickupStore: false
            }
          }]
        }))
      },
      paymentData: {
        transactions: [{
          isActive: true,
          transactionId: crypto.randomUUID(),
          merchantName: 'CPQ Store',
          payments: [{
            id: crypto.randomUUID(),
            paymentSystem: '2',
            paymentSystemName: quote.paymentConditions,
            value: quote.total * 100,
            installments: 1,
            referenceValue: quote.total * 100,
            group: 'creditCard'
          }]
        }]
      }
    };

    return order;
  }

  static async sendOrderToVTEX(quote: Quote): Promise<{ success: boolean; orderId?: string; message: string }> {
    const settings = this.getSettings();
    if (!settings) {
      return { success: false, message: 'Configurações VTEX não encontradas' };
    }

    if (!settings.isEnabled) {
      return { success: false, message: 'Integração VTEX está desabilitada' };
    }

    try {
      // Log início do processo
      this.addLog({
        quoteId: quote.id,
        status: 'processing',
        message: 'Iniciando envio para VTEX'
      });

      const vtexOrder = this.convertQuoteToVTEXOrder(quote);

      // Simular envio para VTEX
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular resposta da VTEX
      const orderId = `VTX-${Date.now()}`;

      // Log sucesso
      this.addLog({
        quoteId: quote.id,
        orderId,
        status: 'success',
        message: `Pedido criado com sucesso: ${orderId}`,
        request: vtexOrder,
        response: { orderId, status: 'order-created' }
      });

      return { success: true, orderId, message: `Pedido criado com sucesso: ${orderId}` };
    } catch (error) {
      // Log erro
      this.addLog({
        quoteId: quote.id,
        status: 'error',
        message: `Erro ao enviar para VTEX: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });

      return { success: false, message: 'Erro ao enviar pedido para VTEX' };
    }
  }

  static getIntegrationLogs(quoteId?: string): VTEXIntegrationLog[] {
    const logs = this.getLogs();
    return quoteId 
      ? logs.filter(log => log.quoteId === quoteId)
      : logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static getCurrentSettings(): VTEXIntegrationSettings | null {
    return this.getSettings();
  }
}
