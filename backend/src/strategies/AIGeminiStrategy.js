import { GoogleGenerativeAI } from '@google/generative-ai';
import { CommerceStrategy } from './CommerceStrategy.js';
import { RuleBasedStrategy } from './RuleBasedStrategy.js';
import { PriceDirection, TriggerReason } from '../models/types.js';

export class AIGeminiStrategy extends CommerceStrategy {
  constructor() {
    super('ai-gemini');
    this.fallbackStrategy = new RuleBasedStrategy();
    this.apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '';
    this.modelName = process.env.LLM_MODEL || 'gemini-1.5-flash';
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Builds specialized prompt based on specific trigger event
   * Two prompts, not one: INVENTORY_LOW vs DEMAND_SPIKE vs MANUAL
   */
  _buildPricingPrompt({ product, categoryStats, triggerReason }) {
    const avgVel = (categoryStats?.avgVelocity || 4.5).toFixed(1);
    const avgPrice = (categoryStats?.avgPrice || product.currentPrice).toFixed(2);
    const runoutDays = product.demandVelocity > 0
      ? (product.stockLevel / product.demandVelocity).toFixed(1)
      : 'N/A';

    if (triggerReason === TriggerReason.INVENTORY_LOW) {
      return `
You are the Lead Merchandising AI for ShopStream e-commerce.
ALERT TRIGGER: INVENTORY_LOW (Critical stock depletion event)

PRODUCT CONTEXT:
- Name: "${product.name}" (${product.sku})
- Category: ${product.category} (Category avg price: $${avgPrice}, category benchmark velocity: ${avgVel} orders/24h)
- Current Price: $${product.currentPrice.toFixed(2)}
- Current Stock: ${product.stockLevel} units (CRITICAL: Below reorder threshold of ${product.reorderThreshold} units)
- Demand Velocity: ${product.demandVelocity} orders in last 24h
- Estimated Days to Stockout: ${runoutDays} days
- Baseline Unit Cost: $${product.costPrice ? product.costPrice.toFixed(2) : 'Unspecified'}

STRATEGIC MERCHANDISING DILEMMA:
When stock is dangerously depleted, there is a fundamental tradeoff:
A) Raise price to ration remaining inventory, capture maximum consumer surplus, and extend runway until new purchase orders arrive.
B) Alternatively, hold price if customer price-sensitivity is acute or if product is a category anchor.
Evaluate elasticity, category conventions for ${product.category}, and formulate an optimal recommendation.

REQUIRED OUTPUT FORMAT:
Respond with ONLY a raw JSON object (no markdown, no backticks, no extra prose) adhering exactly to:
{
  "recommendedPrice": 29.99,
  "direction": "INCREASE" | "DECREASE" | "HOLD",
  "confidence": 0.85,
  "reasoning": "Clear, concise 2-sentence rationale for the merchandising director explaining why this price optimizes revenue or buffers stock."
}`;
    }

    if (triggerReason === TriggerReason.DEMAND_SPIKE) {
      return `
You are the Lead Merchandising AI for ShopStream e-commerce.
ALERT TRIGGER: DEMAND_SPIKE (Viral sales surge event)

PRODUCT CONTEXT:
- Name: "${product.name}" (${product.sku})
- Category: ${product.category} (Category benchmark velocity: ${avgVel} orders/24h)
- Current Price: $${product.currentPrice.toFixed(2)}
- Current Stock: ${product.stockLevel} units (Reorder threshold: ${product.reorderThreshold})
- Demand Velocity: ${product.demandVelocity} orders in last 24h (SURGE: ${(product.demandVelocity / Math.max(1, avgVel)).toFixed(1)}x category benchmark)
- Baseline Unit Cost: $${product.costPrice ? product.costPrice.toFixed(2) : 'Unspecified'}

STRATEGIC MERCHANDISING DILEMMA:
Demand has spiked sharply. The objective is to capitalize on viral buying momentum without immediately killing the conversion flywheel or exhausting inventory before reorder arrival. Determine how much pricing power this surge grants the brand.

REQUIRED OUTPUT FORMAT:
Respond with ONLY a raw JSON object (no markdown, no backticks, no extra prose) adhering exactly to:
{
  "recommendedPrice": 32.99,
  "direction": "INCREASE" | "HOLD" | "DECREASE",
  "confidence": 0.88,
  "reasoning": "2-sentence merchandising rationale detailing demand velocity momentum and conversion elasticity."
}`;
    }

    // Default / Manual Trigger
    return `
You are the Lead Merchandising AI for ShopStream e-commerce.
TRIGGER: On-Demand Catalog Optimization (Manual Review)

PRODUCT CONTEXT:
- Name: "${product.name}" (${product.sku})
- Category: ${product.category} (Category average: $${avgPrice}, benchmark velocity: ${avgVel})
- Current Price: $${product.currentPrice.toFixed(2)}
- Stock: ${product.stockLevel} units (Threshold: ${product.reorderThreshold})
- Demand Velocity: ${product.demandVelocity} orders/24h

Evaluate if the current price point should be increased, decreased, or held to maximize gross merchandise value (GMV) and inventory turns.

REQUIRED OUTPUT FORMAT:
Respond with ONLY a raw JSON object (no markdown, no backticks, no extra prose):
{
  "recommendedPrice": 29.99,
  "direction": "INCREASE" | "DECREASE" | "HOLD",
  "confidence": 0.85,
  "reasoning": "2-sentence merchandising rationale."
}`;
  }

  /**
   * Builds reorder replenishment prompt
   */
  _buildReorderPrompt({ product, categoryStats, triggerReason }) {
    const avgVel = (categoryStats?.avgVelocity || 4.5).toFixed(1);
    const runoutDays = product.demandVelocity > 0
      ? (product.stockLevel / product.demandVelocity).toFixed(1)
      : '30+';

    return `
You are the Supply Chain & Replenishment AI for ShopStream e-commerce.
TRIGGER: ${triggerReason}

PRODUCT REPLENISHMENT CONTEXT:
- Name: "${product.name}" (${product.sku})
- Category: ${product.category} (Peer benchmark velocity: ${avgVel} orders/24h)
- On-hand Stock: ${product.stockLevel} units
- Safety Reorder Threshold: ${product.reorderThreshold} units
- Current Velocity: ${product.demandVelocity} units sold/24h
- Estimated Days until Stockout: ${runoutDays} days
- Standard Lead Time: ~7 business days

Calculate the recommended replenishment batch size and estimated supplier lead time in days to restore an optimal safety buffer while avoiding overstock carrying costs.

REQUIRED OUTPUT FORMAT:
Respond with ONLY a raw JSON object (no markdown, no backticks, no extra prose):
{
  "recommendedQuantity": 150,
  "suggestedLeadTimeDays": 7,
  "confidence": 0.82,
  "reasoning": "Concise rationale explaining the reorder batch size relative to velocity, lead time risk, and safety stock targets."
}`;
  }

  async generatePricingSuggestion(params) {
    if (!this.genAI) {
      console.log('[AI Advisor] No GEMINI_API_KEY detected in environment. Using fallback rule engine.');
      return this.fallbackStrategy.generatePricingSuggestion(params);
    }

    try {
      const prompt = this._buildPricingPrompt(params);
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timeout (8s)')), 8000)),
      ]);

      const rawText = result.response.text();
      const parsed = this._extractJson(rawText);

      // Bounds & Sanity Validation
      const validated = this._validatePricingOutput(parsed, params.product);
      return validated;
    } catch (error) {
      console.warn(`[AI Advisor] AI Pricing Generation Failed (${error.message}). Falling back to Rule-Based Strategy.`);
      const fallback = await this.fallbackStrategy.generatePricingSuggestion(params);
      fallback.reasoning = `[AI Fallback: ${error.message}] ${fallback.reasoning}`;
      return fallback;
    }
  }

  async generateReorderSuggestion(params) {
    if (!this.genAI) {
      return this.fallbackStrategy.generateReorderSuggestion(params);
    }

    try {
      const prompt = this._buildReorderPrompt(params);
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timeout (8s)')), 8000)),
      ]);

      const rawText = result.response.text();
      const parsed = this._extractJson(rawText);

      // Bounds & Sanity Validation
      const validated = this._validateReorderOutput(parsed, params.product);
      return validated;
    } catch (error) {
      console.warn(`[AI Advisor] AI Reorder Generation Failed (${error.message}). Falling back to Rule-Based Strategy.`);
      const fallback = await this.fallbackStrategy.generateReorderSuggestion(params);
      fallback.reasoning = `[AI Fallback: ${error.message}] ${fallback.reasoning}`;
      return fallback;
    }
  }

  _extractJson(text) {
    if (!text) throw new Error('Empty response from AI');
    // Strip markdown code fences if present: ```json ... ```
    let clean = text.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON object structure found in response');
    }
    return JSON.parse(jsonMatch[0]);
  }

  _validatePricingOutput(output, product) {
    const currentPrice = Number(product.currentPrice);
    let recommendedPrice = Number(output.recommendedPrice);

    if (isNaN(recommendedPrice) || recommendedPrice <= 0) {
      throw new Error(`Invalid recommended price value: ${output.recommendedPrice}`);
    }

    // Bounds Guardrails: Cannot be > 5x current price or < 20% current price without bounding
    const maxBound = currentPrice * 5;
    const minBound = currentPrice * 0.2;
    if (recommendedPrice > maxBound) {
      console.warn(`[AI Advisor] Bounding extreme price high: ${recommendedPrice} -> ${maxBound}`);
      recommendedPrice = maxBound;
    } else if (recommendedPrice < minBound) {
      console.warn(`[AI Advisor] Bounding extreme price low: ${recommendedPrice} -> ${minBound}`);
      recommendedPrice = minBound;
    }

    recommendedPrice = Math.round(recommendedPrice * 100) / 100;

    let direction = output.direction;
    if (!Object.values(PriceDirection).includes(direction)) {
      direction = recommendedPrice > currentPrice
        ? PriceDirection.INCREASE
        : (recommendedPrice < currentPrice ? PriceDirection.DECREASE : PriceDirection.HOLD);
    }

    const confidence = Math.min(1.0, Math.max(0.1, Number(output.confidence) || 0.85));
    const reasoning = (output.reasoning || 'AI Recommended adjustment based on stock velocity.').trim();

    return {
      recommendedPrice,
      direction,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  _validateReorderOutput(output, product) {
    let quantity = Math.round(Number(output.recommendedQuantity));
    if (isNaN(quantity) || quantity < 1) {
      quantity = Math.max(1, (product.reorderThreshold * 3) - product.stockLevel);
    }
    // Cap at reasonable maximum (e.g. 5,000 units)
    if (quantity > 5000) quantity = 5000;

    let leadTime = Math.round(Number(output.suggestedLeadTimeDays));
    if (isNaN(leadTime) || leadTime < 1) leadTime = 7;

    const confidence = Math.min(1.0, Math.max(0.1, Number(output.confidence) || 0.80));
    const reasoning = (output.reasoning || 'AI replenishment order quantity based on velocity buffer.').trim();

    return {
      recommendedQuantity: quantity,
      suggestedLeadTimeDays: leadTime,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }
}
