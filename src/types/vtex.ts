
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
  status: 'pending' | 'processing' | 'success' | 'error' | 'validating' | 'approved' | 'rejected';
  message: string;
  request?: any;
  response?: any;
  validationResults?: ValidationResult[];
  approvalData?: ApprovalData;
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
  approvalRules: ApprovalRule[];
  validationRules: ValidationRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRule {
  id: string;
  name: string;
  condition: 'value' | 'margin' | 'customer' | 'product';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'contains';
  value: string | number;
  action: 'auto_approve' | 'require_approval' | 'reject';
  priority: number;
  isActive: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'stock' | 'price' | 'customer' | 'product' | 'tax';
  isRequired: boolean;
  isActive: boolean;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export interface ApprovalData {
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  comments?: string;
}

export interface ConversionMetrics {
  totalQuotes: number;
  convertedQuotes: number;
  conversionRate: number;
  averageConversionTime: number;
  totalRevenue: number;
  successfulIntegrations: number;
  failedIntegrations: number;
  pendingApprovals: number;
}

export interface ConversionTimeline {
  quoteId: string;
  steps: ConversionStep[];
}

export interface ConversionStep {
  id: string;
  name: string;
  status: 'completed' | 'pending' | 'failed' | 'skipped';
  timestamp?: Date;
  duration?: number;
  details?: string;
  error?: string;
}
