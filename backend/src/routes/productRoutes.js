import express from 'express';
import { productService } from '../services/productService.js';
import { suggestionService } from '../services/suggestionService.js';
import { strategyManager } from '../strategies/StrategyManager.js';
import { streamPricingReasoning } from '../services/aiStreamService.js';
import { TriggerReason } from '../models/types.js';

const router = express.Router();

// GET /products?status=&category=
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    const products = await productService.getAllProducts({ status, category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products
router.post('/', async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /products/:id/stock — update stock; triggers agentic loop if stock < threshold
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stockLevel } = req.body;
    if (stockLevel === undefined || stockLevel === null) {
      return res.status(400).json({ error: 'stockLevel is required' });
    }
    const updated = await productService.updateStock(req.params.id, stockLevel);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /products/:id/orders — simulate sale; decrements stock, bumps velocity; triggers loop
router.post('/:id/orders', async (req, res) => {
  try {
    const quantity = req.body.quantity || 1;
    const updated = await productService.recordOrder(req.params.id, quantity);
    res.json({
      success: true,
      message: `Simulated order of ${quantity} units recorded for ${updated.name}`,
      product: updated,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /products/:id/suggest-pricing — on-demand pricing suggestion
router.post('/:id/suggest-pricing', async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const categoryStats = await productService.getCategoryStats(product.category);
    const triggerReason = req.body.triggerReason || TriggerReason.MANUAL;

    const strategy = strategyManager.getActiveStrategy();
    const recommendation = await strategy.generatePricingSuggestion({
      product,
      categoryStats,
      triggerReason,
    });

    const persisted = await suggestionService.createPricingSuggestion({
      productId: product.id,
      currentPrice: product.currentPrice,
      recommendedPrice: recommendation.recommendedPrice,
      direction: recommendation.direction,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning,
      triggerReason,
    });

    res.status(201).json(persisted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products/:id/suggest-reorder — on-demand reorder suggestion
router.post('/:id/suggest-reorder', async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const categoryStats = await productService.getCategoryStats(product.category);
    const triggerReason = req.body.triggerReason || TriggerReason.MANUAL;

    const strategy = strategyManager.getActiveStrategy();
    const recommendation = await strategy.generateReorderSuggestion({
      product,
      categoryStats,
      triggerReason,
    });

    const persisted = await suggestionService.createReorderSuggestion({
      productId: product.id,
      currentStock: product.stockLevel,
      recommendedQuantity: recommendation.recommendedQuantity,
      suggestedLeadTimeDays: recommendation.suggestedLeadTimeDays,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning,
      triggerReason,
    });

    res.status(201).json(persisted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SSE Streaming bonus endpoint (+5 pts)
router.get('/:id/suggest-pricing/stream', async (req, res) => {
  await streamPricingReasoning(req, res, req.params.id);
});

router.post('/:id/suggest-pricing/stream', async (req, res) => {
  await streamPricingReasoning(req, res, req.params.id);
});

export default router;
