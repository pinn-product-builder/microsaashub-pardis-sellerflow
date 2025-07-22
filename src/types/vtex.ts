
export interface VTEXConfig {
  accountName: string;
  environment: 'stable' | 'beta';
  appKey: string;
  appToken: string;
  baseUrl: string;
}

export interface VTEXOrderItem {
  id: string;
  quantity: number;
  seller: string;
  price: number;
  listPrice: number;
  measurementUnit: string;
  unitMultiplier: number;
}

export interface VTEXOrder {
  orderId?: string;
  sequence?: number;
  marketplaceOrderId?: string;
  marketplaceServicesEndpoint?: string;
  sellerOrderId?: string;
  origin: string;
  affiliate: string;
  salesChannel: string;
  merchantName?: string;
  status?: string;
  statusDescription?: string;
  value: number;
  creationDate?: string;
  lastChange?: string;
  orderGroup?: string;
  totals: Array<{
    id: string;
    name: string;
    value: number;
  }>;
  items: VTEXOrderItem[];
  clientProfileData: {
    id?: string;
    email: string;
    firstName: string;
    lastName: string;
    documentType: string;
    document: string;
    phone: string;
    corporateName?: string;
    tradeName?: string;
    corporateDocument?: string;
    stateInscription?: string;
    corporatePhone?: string;
    isCorporate: boolean;
  };
  shippingData: {
    id?: string;
    address: {
      addressType: string;
      receiverName: string;
      addressId?: string;
      postalCode: string;
      city: string;
      state: string;
      country: string;
      street: string;
      number: string;
      neighborhood: string;
      complement?: string;
      reference?: string;
    };
    logisticsInfo: Array<{
      itemIndex: number;
      selectedSla: string;
      lockTTL: string;
      price: number;
      listPrice: number;
      sellingPrice: number;
      deliveryWindow?: any;
      deliveryCompany: string;
      shippingEstimate: string;
      shippingEstimateDate: string;
      slas: Array<{
        id: string;
        name: string;
        shippingEstimate: string;
        price: number;
        availableDeliveryWindows: any[];
        pickupStoreInfo: {
          additionalInfo?: string;
          address?: any;
          dockId?: string;
          friendlyName?: string;
          isPickupStore: boolean;
        };
      }>;
    }>;
  };
  paymentData: {
    transactions: Array<{
      isActive: boolean;
      transactionId: string;
      merchantName: string;
      payments: Array<{
        id: string;
        paymentSystem: string;
        paymentSystemName: string;
        value: number;
        installments: number;
        referenceValue: number;
        cardHolder?: string;
        cardNumber?: string;
        firstDigits?: string;
        lastDigits?: string;
        cvv2?: string;
        expireMonth?: string;
        expireYear?: string;
        url?: string;
        giftCardId?: string;
        giftCardName?: string;
        giftCardCaption?: string;
        redemptionCode?: string;
        group: string;
        tid?: string;
        dueDate?: string;
        connectorResponses?: any;
      }>;
    }>;
  };
}

export interface VTEXIntegrationLog {
  id: string;
  quoteId: string;
  orderId?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message: string;
  request?: any;
  response?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface VTEXIntegrationSettings {
  id: string;
  isEnabled: boolean;
  config: VTEXConfig;
  defaultSalesChannel: string;
  defaultAffiliate: string;
  defaultSeller: string;
  productMapping: Record<string, string>; // CPQ Product ID -> VTEX SKU ID
  createdAt: Date;
  updatedAt: Date;
}
