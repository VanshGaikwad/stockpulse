import { GoogleGenerativeAI } from '@google/generative-ai';
import { productService } from './productService.js';
import { strategyManager } from '../strategies/StrategyManager.js';
import { TriggerReason } from '../models/types.js';

export async function streamPricingReasoning(req, res, productId) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const product = await productService.getProductById(productId);
    if (!product) {
      sendEvent('error', { message: `Product ${productId} not found` });
      res.end();
      return;
    }

    const categoryStats = await productService.getCategoryStats(product.category);
    const triggerReason = req.query.trigger || TriggerReason.MANUAL;

    sendEvent('start', {
      productId: product.id,
      productName: product.name,
      currentPrice: product.currentPrice,
      triggerReason,
      strategy: strategyManager.getActiveStrategyKey(),
    });

    const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.LLM_MODEL || 'gemini-1.5-flash' });
        const prompt = `You are ShopStream Lead Pricing AI. Formulate dynamic pricing reasoning for product:
Name: ${product.name}
Category: ${product.category}
Current Price: $${product.currentPrice}
Stock: ${product.stockLevel} units (Threshold: ${product.reorderThreshold})
Demand Velocity: ${product.demandVelocity} orders/24h
Category Avg Velocity: ${categoryStats.avgVelocity.toFixed(1)} orders/24h

Provide step-by-step reasoning explaining if price should be increased, decreased, or held, considering inventory protection and consumer elasticity.`;

        const streamingResponse = await model.generateContentStream(prompt);
        let fullText = '';
        for await (const chunk of streamingResponse.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          sendEvent('token', { text: chunkText });
        }

        // Final recommendation
        const strategy = strategyManager.getActiveStrategy();
        const finalRec = await strategy.generatePricingSuggestion({
          product,
          categoryStats,
          triggerReason,
        });

        sendEvent('complete', {
          fullReasoning: fullText,
          recommendation: finalRec,
        });
        res.end();
        return;
      } catch (geminiError) {
        console.warn('[SSE Stream] Gemini streaming error, using progressive fallback:', geminiError.message);
      }
    }

    // High fidelity simulated token stream for local zero-config evaluation
    const fallbackRec = await strategyManager.getActiveStrategy().generatePricingSuggestion({
      product,
      categoryStats,
      triggerReason,
    });

    const words = fallbackRec.reasoning.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      sendEvent('token', { text: words[i] + ' ' });
    }

    sendEvent('complete', {
      fullReasoning: fallbackRec.reasoning,
      recommendation: fallbackRec,
    });
    res.end();
  } catch (error) {
    console.error('[SSE Stream] Error in pricing reasoning stream:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
}
