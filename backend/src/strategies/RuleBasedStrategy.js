import { CommerceStrategy } from './CommerceStrategy.js';
import { PriceDirection } from '../models/types.js';

export class RuleBasedStrategy extends CommerceStrategy {
  constructor() {
    super('rule-based');
  }

  /**
   * Rule-based pricing logic:
   * 1. If stock < reorderThreshold -> +10% price increase (protect remaining buffer)
   * 2. Else if demandVelocity > 2 * categoryAvgVelocity -> +5% price increase (capitalize on velocity)
   * 3. Else -> HOLD current price
   */
  async generatePricingSuggestion({ product, categoryStats, triggerReason }) {
    const currentPrice = Number(product.currentPrice);
    const stock = Number(product.stockLevel);
    const threshold = Number(product.reorderThreshold);
    const velocity = Number(product.demandVelocity || 0);
    const avgVelocity = Number(categoryStats?.avgVelocity || 5.0);

    let recommendedPrice = currentPrice;
    let direction = PriceDirection.HOLD;
    let confidence = 0.90;
    let reasoning = '';

    if (stock < threshold) {
      // 10% increase to protect scarce inventory
      recommendedPrice = Math.round(currentPrice * 1.10 * 100) / 100;
      direction = PriceDirection.INCREASE;
      confidence = 0.88;
      reasoning = `Deterministic Rule: Stock level (${stock} units) is below reorder threshold (${threshold} units). Recommended a 10% price increase ($${currentPrice.toFixed(2)} → $${recommendedPrice.toFixed(2)}) to slow run-out rate and protect margins while replenishment is initiated.`;
    } else if (velocity > avgVelocity * 2) {
      // 5% increase for high demand velocity
      recommendedPrice = Math.round(currentPrice * 1.05 * 100) / 100;
      direction = PriceDirection.INCREASE;
      confidence = 0.82;
      reasoning = `Deterministic Rule: 24h demand velocity (${velocity} orders/day) is >2× the ${product.category} category benchmark (${avgVelocity.toFixed(1)} orders/day). Recommended a 5% optimization ($${currentPrice.toFixed(2)} → $${recommendedPrice.toFixed(2)}) to capitalize on strong demand momentum.`;
    } else {
      recommendedPrice = currentPrice;
      direction = PriceDirection.HOLD;
      confidence = 0.92;
      reasoning = `Deterministic Rule: Inventory (${stock} units vs threshold ${threshold}) and demand velocity (${velocity} orders/day) are stable within normal category parameters. Current price of $${currentPrice.toFixed(2)} held.`;
    }

    return {
      recommendedPrice,
      direction,
      confidence,
      reasoning,
    };
  }

  /**
   * Rule-based reorder logic:
   * quantity = (reorderThreshold * 3) - currentStock (min 1)
   */
  async generateReorderSuggestion({ product, triggerReason }) {
    const stock = Number(product.stockLevel);
    const threshold = Number(product.reorderThreshold);

    const calculatedTarget = threshold * 3;
    const recommendedQuantity = Math.max(1, calculatedTarget - stock);
    const suggestedLeadTimeDays = 7;
    const confidence = 0.85;

    const reasoning = `Deterministic Rule: Baseline 3× safety stock target (${calculatedTarget} units) minus current inventory (${stock} units) yields a replenishment order of ${recommendedQuantity} units. Estimated supplier lead time: ${suggestedLeadTimeDays} days.`;

    return {
      recommendedQuantity,
      suggestedLeadTimeDays,
      confidence,
      reasoning,
    };
  }
}
