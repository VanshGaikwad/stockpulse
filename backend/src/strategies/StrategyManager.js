import { RuleBasedStrategy } from './RuleBasedStrategy.js';
import { AIGeminiStrategy } from './AIGeminiStrategy.js';
import { StrategyType } from '../models/types.js';

class HybridStrategy {
  constructor(aiStrategy, ruleStrategy) {
    this.name = 'hybrid';
    this.ai = aiStrategy;
    this.rules = ruleStrategy;
  }

  async generatePricingSuggestion(params) {
    // Attempt AI first, automatically fallback to rules
    return this.ai.generatePricingSuggestion(params);
  }

  async generateReorderSuggestion(params) {
    return this.ai.generateReorderSuggestion(params);
  }

  async generateUnifiedSuggestions(params) {
    const [pricing, reorder] = await Promise.all([
      this.generatePricingSuggestion(params),
      this.generateReorderSuggestion(params),
    ]);
    return { pricing, reorder };
  }
}

class StrategyManager {
  constructor() {
    this.strategies = new Map();
    
    const ruleBased = new RuleBasedStrategy();
    const aiGemini = new AIGeminiStrategy();
    const hybrid = new HybridStrategy(aiGemini, ruleBased);

    this.registerStrategy(StrategyType.RULE_BASED, ruleBased);
    this.registerStrategy(StrategyType.AI_GEMINI, aiGemini);
    this.registerStrategy(StrategyType.HYBRID, hybrid);

    // Default to 'hybrid' (tries AI with automatic fallback) or env-configured
    this.activeStrategyKey = process.env.COMMERCE_STRATEGY || StrategyType.HYBRID;
    console.log(`[StrategyManager] Initialized with active strategy: ${this.activeStrategyKey}`);
  }

  /**
   * Register a new commerce strategy (Extension point for Sprint 2 CompetitorAwareStrategy)
   */
  registerStrategy(key, strategyInstance) {
    this.strategies.set(key, strategyInstance);
    console.log(`[StrategyManager] Registered strategy: ${key}`);
  }

  /**
   * Runtime switch of active strategy without server restart
   */
  setActiveStrategy(key) {
    if (!this.strategies.has(key)) {
      throw new Error(`Strategy "${key}" is not registered. Available: ${Array.from(this.strategies.keys()).join(', ')}`);
    }
    const previous = this.activeStrategyKey;
    this.activeStrategyKey = key;
    console.log(`[StrategyManager] Active strategy switched at runtime: ${previous} -> ${key}`);
    return {
      success: true,
      activeStrategy: this.activeStrategyKey,
      previousStrategy: previous,
    };
  }

  getActiveStrategyKey() {
    return this.activeStrategyKey;
  }

  getActiveStrategy() {
    const strategy = this.strategies.get(this.activeStrategyKey);
    if (!strategy) {
      // Fallback
      return this.strategies.get(StrategyType.RULE_BASED);
    }
    return strategy;
  }

  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }
}

export const strategyManager = new StrategyManager();
