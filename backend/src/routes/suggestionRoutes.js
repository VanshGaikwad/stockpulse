import express from 'express';
import { suggestionService } from '../services/suggestionService.js';
import { SuggestionStatus } from '../models/types.js';

export const pricingRouter = express.Router();
export const reorderRouter = express.Router();

// --- Pricing Suggestions ---

// GET /pricing-suggestions?productId=&status=
pricingRouter.get('/', async (req, res) => {
  try {
    const { productId, status } = req.query;
    const suggestions = await suggestionService.getPricingSuggestions({ productId, status });
    // Sort descending by createdAt
    suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /pricing-suggestions/:id — accept or reject suggestion
pricingRouter.patch('/:id', async (req, res) => {
  try {
    const action = req.body.action || req.body.status;
    if (!action) {
      return res.status(400).json({ error: 'action ("ACCEPT" | "REJECT") is required' });
    }

    const normalized = action.toUpperCase();
    if (normalized === 'ACCEPT' || normalized === SuggestionStatus.ACCEPTED) {
      const result = await suggestionService.acceptPricingSuggestion(req.params.id);
      return res.json({
        success: true,
        message: `Pricing suggestion accepted. Product price updated to $${result.recommendedPrice}`,
        suggestion: result,
      });
    } else if (normalized === 'REJECT' || normalized === SuggestionStatus.REJECTED) {
      const result = await suggestionService.rejectPricingSuggestion(req.params.id);
      return res.json({
        success: true,
        message: 'Pricing suggestion rejected',
        suggestion: result,
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be ACCEPT or REJECT' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Reorder Suggestions ---

// GET /reorder-suggestions?productId=&status=
reorderRouter.get('/', async (req, res) => {
  try {
    const { productId, status } = req.query;
    const suggestions = await suggestionService.getReorderSuggestions({ productId, status });
    suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /reorder-suggestions/:id — accept or reject suggestion
reorderRouter.patch('/:id', async (req, res) => {
  try {
    const action = req.body.action || req.body.status;
    if (!action) {
      return res.status(400).json({ error: 'action ("ACCEPT" | "REJECT") is required' });
    }

    const normalized = action.toUpperCase();
    if (normalized === 'ACCEPT' || normalized === SuggestionStatus.ACCEPTED) {
      const result = await suggestionService.acceptReorderSuggestion(req.params.id);
      return res.json({
        success: true,
        message: `Reorder suggestion accepted. Simulated shipment of ${result.recommendedQuantity} units added to stock`,
        suggestion: result,
      });
    } else if (normalized === 'REJECT' || normalized === SuggestionStatus.REJECTED) {
      const result = await suggestionService.rejectReorderSuggestion(req.params.id);
      return res.json({
        success: true,
        message: 'Reorder suggestion rejected',
        suggestion: result,
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be ACCEPT or REJECT' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
