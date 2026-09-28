import express from 'express';
import { strategyManager } from '../strategies/StrategyManager.js';
import { productService } from '../services/productService.js';
import { suggestionService } from '../services/suggestionService.js';
import { isUsingMemoryStore } from '../config/firebase.js';

const router = express.Router();

// GET /config/strategy
router.get('/strategy', (req, res) => {
  res.json({
    activeStrategy: strategyManager.getActiveStrategyKey(),
    availableStrategies: strategyManager.getAvailableStrategies(),
    isMockDatabase: isUsingMemoryStore(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || process.env.LLM_API_KEY),
  });
});

// POST /config/strategy — switch active strategy at runtime without restart
router.post('/strategy', (req, res) => {
  const { strategy } = req.body;
  if (!strategy) {
    return res.status(400).json({ error: 'strategy field is required' });
  }

  try {
    const result = strategyManager.setActiveStrategy(strategy);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /seed — reset/reseed catalog
router.post('/seed', async (req, res) => {
  try {
    const result = await productService.seedDatabase(true);
    res.json({
      success: true,
      message: `Database reseeded with ${result.count} products`,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /stats — dashboard summary metrics
router.get('/stats', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    const pendingPricing = await suggestionService.getPricingSuggestions({ status: 'PENDING' });
    const pendingReorder = await suggestionService.getReorderSuggestions({ status: 'PENDING' });

    let lowStockCount = 0;
    let spikeCount = 0;
    let totalValue = 0;

    for (const p of products) {
      if (p.stockLevel < p.reorderThreshold) {
        lowStockCount++;
      }
      if (p.demandVelocity > 10) {
        spikeCount++;
      }
      totalValue += Number(p.currentPrice || 0) * Number(p.stockLevel || 0);
    }

    res.json({
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
      pendingReviewProducts: products.filter((p) => p.status === 'PRICE_REVIEW_PENDING').length,
      outOfStockProducts: products.filter((p) => p.status === 'OUT_OF_STOCK').length,
      lowStockAlerts: lowStockCount,
      demandSpikeAlerts: spikeCount,
      totalInventoryValue: Math.round(totalValue * 100) / 100,
      pendingPricingCount: pendingPricing.length,
      pendingReorderCount: pendingReorder.length,
      activeStrategy: strategyManager.getActiveStrategyKey(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
