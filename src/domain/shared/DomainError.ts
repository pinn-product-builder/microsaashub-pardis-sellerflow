// Domain Error class for business rule violations
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, field?: string) {
    super(message, `VALIDATION_${field?.toUpperCase() || 'ERROR'}`);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(`${entity} não encontrado${id ? `: ${id}` : ''}`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Não autorizado') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, rule?: string) {
    super(message, `BUSINESS_RULE_${rule?.toUpperCase() || 'VIOLATION'}`);
    this.name = 'BusinessRuleError';
  }
}
