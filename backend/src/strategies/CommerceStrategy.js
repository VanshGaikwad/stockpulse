/**
 * Base Abstract Commerce Strategy Contract
 * Extensible interface implemented by RuleBasedStrategy, AIGeminiStrategy,
 * and future Sprint 2 strategies like CompetitorAwareStrategy.
 */
export class CommerceStrategy {
  /**
   * @param {string} name - Strategy identifier
   */
  constructor(name) {
    if (new.target === CommerceStrategy) {
      throw new TypeError('Cannot construct CommerceStrategy instances directly');
    }
    this.name = name;
  }

  /**
   * Generates a dynamic pricing suggestion
   * @param {Object} params
   * @param {Object} params.product - Product entity
   * @param {Object} params.categoryStats - Category peers analytics (avgVelocity, avgPrice, etc.)
   * @param {string} params.triggerReason - 'INITIAL' | 'INVENTORY_LOW' | 'DEMAND_SPIKE' | 'MANUAL'
   * @param {string} [params.customContext] - Additional human or event context
   * @returns {Promise<{
   *   recommendedPrice: number,
   *   direction: 'INCREASE'|'DECREASE'|'HOLD',
   *   confidence: number,
   *   reasoning: string
   * }>}
   */
  async generatePricingSuggestion(params) {
    throw new Error('generatePricingSuggestion must be implemented by subclass');
  }

  /**
   * Generates a replenishment reorder suggestion
   * @param {Object} params
   * @param {Object} params.product - Product entity
   * @param {Object} params.categoryStats - Category peers analytics
   * @param {string} params.triggerReason - 'INITIAL' | 'INVENTORY_LOW' | 'DEMAND_SPIKE' | 'MANUAL'
   * @param {string} [params.customContext] - Additional human or event context
   * @returns {Promise<{
   *   recommendedQuantity: number,
   *   suggestedLeadTimeDays: number,
   *   confidence: number,
   *   reasoning: string
   * }>}
   */
  async generateReorderSuggestion(params) {
    throw new Error('generateReorderSuggestion must be implemented by subclass');
  }

  /**
   * Unified recommendation convenience call
   * @returns {Promise<{ pricing: Object, reorder: Object }>}
   */
  async generateUnifiedSuggestions(params) {
    const [pricing, reorder] = await Promise.all([
      this.generatePricingSuggestion(params),
      this.generateReorderSuggestion(params),
    ]);
    return { pricing, reorder };
  }
}
