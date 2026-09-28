import EventEmitter from 'events';
import { strategyManager } from '../strategies/StrategyManager.js';
import { suggestionService } from './suggestionService.js';
import { TriggerReason } from '../models/types.js';

class AgenticLoopEmitter extends EventEmitter {}

export class AgenticRecommendationLoop {
  constructor() {
    this.emitter = new AgenticLoopEmitter();
    this.setupListeners();
  }

  setupListeners() {
    this.emitter.on('STOCK_SIGNAL', (payload) => this._processStockSignal(payload));
    this.emitter.on('DEMAND_SIGNAL', (payload) => this._processDemandSignal(payload));
  }

  /**
   * Called by productService when stock updates
   * Executes asynchronously without delaying HTTP response
   */
  handleStockUpdate({ product, previousStock, categoryStats }) {
    if (product.stockLevel < product.reorderThreshold) {
      console.log(`[AgenticLoop] Trigger A fired (INVENTORY_LOW) for ${product.sku} (${product.name}). Stock: ${product.stockLevel}, Threshold: ${product.reorderThreshold}`);
      this.emitter.emit('STOCK_SIGNAL', {
        product,
        categoryStats,
        triggerReason: TriggerReason.INVENTORY_LOW,
      });
    }
  }

  /**
   * Called by productService when order is recorded
   */
  handleOrderSimulated({ product, previousStock, orderQty, categoryStats }) {
    const avgVelocity = categoryStats?.avgVelocity || 5.0;
    const isSpike = product.demandVelocity > Math.max(10, avgVelocity * 2.5);

    // Check Trigger A: Inventory Low
    if (product.stockLevel < product.reorderThreshold) {
      console.log(`[AgenticLoop] Trigger A fired (INVENTORY_LOW) via Order for ${product.sku}. Stock: ${product.stockLevel}/${product.reorderThreshold}`);
      this.emitter.emit('STOCK_SIGNAL', {
        product,
        categoryStats,
        triggerReason: TriggerReason.INVENTORY_LOW,
      });
    }

    // Check Trigger B: Demand Spike
    if (isSpike) {
      console.log(`[AgenticLoop] Trigger B fired (DEMAND_SPIKE) for ${product.sku}. Velocity: ${product.demandVelocity} vs Category Avg: ${avgVelocity.toFixed(1)}`);
      this.emitter.emit('DEMAND_SIGNAL', {
        product,
        categoryStats,
        triggerReason: TriggerReason.DEMAND_SPIKE,
      });
    }
  }

  async _processStockSignal({ product, categoryStats, triggerReason }) {
    await this._executeRecommendationRun({ product, categoryStats, triggerReason });
  }

  async _processDemandSignal({ product, categoryStats, triggerReason }) {
    await this._executeRecommendationRun({ product, categoryStats, triggerReason });
  }

  /**
   * Core Autonomous Reasoning & Suggestion Queuing Pipeline
   * Features:
   * 1. Idempotency Check: Prevents redundant suggestions for same product + trigger
   * 2. Active Strategy Execution (AI or Rule-based)
   * 3. Resilient Fallback: Never drops silently
   * 4. Human-in-the-loop checkpoint: queues for Merchandising approval
   */
  async _executeRecommendationRun({ product, categoryStats, triggerReason }) {
    try {
      // 1. Idempotency & Duplicate Guard
      const [hasPricing, hasReorder] = await Promise.all([
        suggestionService.hasPendingSuggestion(product.id, triggerReason, 'pricing'),
        suggestionService.hasPendingSuggestion(product.id, triggerReason, 'reorder'),
      ]);

      if (hasPricing && hasReorder) {
        console.log(`[AgenticLoop] Idempotency: Pending suggestions already exist for ${product.sku} with trigger ${triggerReason}. Skipping duplicate run.`);
        return;
      }

      console.log(`[AgenticLoop] Generating commerce recommendations for ${product.sku} using [${strategyManager.getActiveStrategyKey()}] strategy...`);
      const strategy = strategyManager.getActiveStrategy();

      // 2. Generate Pricing Recommendation
      if (!hasPricing) {
        try {
          const pricingRec = await strategy.generatePricingSuggestion({
            product,
            categoryStats,
            triggerReason,
          });

          await suggestionService.createPricingSuggestion({
            productId: product.id,
            currentPrice: product.currentPrice,
            recommendedPrice: pricingRec.recommendedPrice,
            direction: pricingRec.direction,
            confidence: pricingRec.confidence,
            reasoning: pricingRec.reasoning,
            triggerReason,
          });
          console.log(`[AgenticLoop] Queued PricingSuggestion for ${product.sku}: $${product.currentPrice} -> $${pricingRec.recommendedPrice} (${pricingRec.direction})`);
        } catch (err) {
          console.error(`[AgenticLoop] Error creating pricing suggestion:`, err.message);
        }
      }

      // 3. Generate Reorder Recommendation
      if (!hasReorder) {
        try {
          const reorderRec = await strategy.generateReorderSuggestion({
            product,
            categoryStats,
            triggerReason,
          });

          await suggestionService.createReorderSuggestion({
            productId: product.id,
            currentStock: product.stockLevel,
            recommendedQuantity: reorderRec.recommendedQuantity,
            suggestedLeadTimeDays: reorderRec.suggestedLeadTimeDays,
            confidence: reorderRec.confidence,
            reasoning: reorderRec.reasoning,
            triggerReason,
          });
          console.log(`[AgenticLoop] Queued ReorderSuggestion for ${product.sku}: +${reorderRec.recommendedQuantity} units`);
        } catch (err) {
          console.error(`[AgenticLoop] Error creating reorder suggestion:`, err.message);
        }
      }
    } catch (criticalError) {
      console.error(`[AgenticLoop] Critical error in recommendation run for ${product?.sku}:`, criticalError);
    }
  }
}

export const agenticLoop = new AgenticRecommendationLoop();
