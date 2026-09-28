/**
 * StockPulse Domain Enums & Constants
 * Defines domain state machines and extension points for Sprint 2
 */

export const Category = Object.freeze({
  ELECTRONICS: 'ELECTRONICS',
  APPAREL: 'APPAREL',
  HOME: 'HOME',
});

export const ProductStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  PRICE_REVIEW_PENDING: 'PRICE_REVIEW_PENDING',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
});

export const SuggestionStatus = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
});

export const TriggerReason = Object.freeze({
  INITIAL: 'INITIAL',
  INVENTORY_LOW: 'INVENTORY_LOW',
  DEMAND_SPIKE: 'DEMAND_SPIKE',
  MANUAL: 'MANUAL',
});

export const PriceDirection = Object.freeze({
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  HOLD: 'HOLD',
});

export const StrategyType = Object.freeze({
  RULE_BASED: 'rule-based',
  AI_GEMINI: 'ai-gemini',
  HYBRID: 'hybrid',
});
