import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes.js';
import { pricingRouter, reorderRouter } from './routes/suggestionRoutes.js';
import configRoutes from './routes/configRoutes.js';
import { initFirebase } from './config/firebase.js';
import { productService } from './services/productService.js';
import { strategyManager } from './strategies/StrategyManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for frontend Vite development server & production builds
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.includes('/stream')) {
      console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Root & Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'StockPulse AI Inventory & Dynamic Pricing Engine',
    timestamp: new Date().toISOString(),
    activeStrategy: strategyManager.getActiveStrategyKey(),
  });
});

// API Routes
app.use('/products', productRoutes);
app.use('/pricing-suggestions', pricingRouter);
app.use('/reorder-suggestions', reorderRouter);
app.use('/config', configRoutes);
app.use('/', configRoutes); // Exposes /seed and /stats at top level as well

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error] Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Server Initialization
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('⚡ Starting StockPulse Commerce & Dynamic Pricing Engine');
    console.log('----------------------------------------------------');

    // 1. Initialize Firebase Firestore
    initFirebase();

    // 2. Ensure initial seed data exists
    await productService.seedDatabase(false);

    // 3. Start listening
    app.listen(PORT, () => {
      console.log(`🚀 StockPulse Backend running on http://localhost:${PORT}`);
      console.log(`📋 API Documentation:`);
      console.log(`   - GET  /products                  (Filterable product catalog)`);
      console.log(`   - POST /products/:id/orders       (Simulate sale -> fires agentic loop)`);
      console.log(`   - PATCH /products/:id/stock       (Update stock -> fires agentic loop)`);
      console.log(`   - GET  /pricing-suggestions       (Review pending price suggestions)`);
      console.log(`   - PATCH /pricing-suggestions/:id  (Accept/Reject price change)`);
      console.log(`   - GET  /reorder-suggestions       (Review replenishment suggestions)`);
      console.log(`   - PATCH /reorder-suggestions/:id  (Accept/Reject reorder)`);
      console.log(`   - GET  /products/:id/suggest-pricing/stream (SSE token stream bonus)`);
      console.log(`   - POST /config/strategy           (Runtime strategy switcher)`);
      console.log(`   - POST /seed                      (Reset seed data)`);
      console.log('----------------------------------------------------');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
