import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar.jsx';
import DemoWalkthrough from './components/DemoWalkthrough.jsx';
import ScoreStrip from './components/ScoreStrip.jsx';
import SuggestionsQueue from './components/SuggestionsQueue.jsx';
import CatalogBoard from './components/CatalogBoard.jsx';
import AIStreamModal from './components/AIStreamModal.jsx';
import {
  fetchProducts,
  fetchPricingSuggestions,
  fetchReorderSuggestions,
  fetchStats,
  fetchStrategyConfig,
  setStrategyConfig,
  reseedDatabase,
  simulateOrder,
  updateProductStock,
  actOnPricingSuggestion,
  actOnReorderSuggestion,
  requestPricingSuggestion,
  requestReorderSuggestion,
} from './api.js';

export default function App() {
  const [products, setProducts] = useState([]);
  const [pricingSuggestions, setPricingSuggestions] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState('hybrid');
  const [streamModalProductId, setStreamModalProductId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [prods, pricing, reorders, st, strat] = await Promise.all([
        fetchProducts(),
        fetchPricingSuggestions('PENDING'),
        fetchReorderSuggestions('PENDING'),
        fetchStats(),
        fetchStrategyConfig(),
      ]);

      setProducts(prods);
      setPricingSuggestions(pricing);
      setReorderSuggestions(reorders);
      setStats(st);
      if (strat?.activeStrategy) {
        setActiveStrategy(strat.activeStrategy);
      }
    } catch (err) {
      console.warn('Sync notice:', err.message);
    }
  }, []);

  // Initial load + 3-second background polling for seamless agentic loop updates
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const productsMap = useMemo(() => {
    const map = {};
    for (const p of products) {
      map[p.id] = p;
    }
    return map;
  }, [products]);

  // Strategy switch
  const handleStrategyChange = async (strategy) => {
    try {
      await setStrategyConfig(strategy);
      setActiveStrategy(strategy);
      showToast(`Runtime Strategy switched to "${strategy.toUpperCase()}"`, 'success');
      loadData();
    } catch (err) {
      showToast(`Strategy switch failed: ${err.message}`, 'error');
    }
  };

  // Reseed catalog
  const handleReseed = async () => {
    try {
      setIsLoading(true);
      await reseedDatabase();
      await loadData();
      showToast('Database reseeded with Addendum A baseline products', 'success');
    } catch (err) {
      showToast(`Reseed error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate Order
  const handleSimulateOrder = async (productId, quantity = 1) => {
    try {
      setIsLoading(true);
      const res = await simulateOrder(productId, quantity);
      showToast(res.message || `Simulated sale of ${quantity} units`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Sale simulation failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update Stock
  const handleUpdateStock = async (productId, newStock) => {
    try {
      setIsLoading(true);
      await updateProductStock(productId, newStock);
      showToast(`Stock updated to ${newStock} units`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Stock update failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Pricing Approval
  const handleAcceptPricing = async (id) => {
    try {
      setIsLoading(true);
      const res = await actOnPricingSuggestion(id, 'ACCEPT');
      showToast(res.message, 'success');
      await loadData();
    } catch (err) {
      showToast(`Accept failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectPricing = async (id) => {
    try {
      setIsLoading(true);
      await actOnPricingSuggestion(id, 'REJECT');
      showToast('Pricing suggestion rejected', 'info');
      await loadData();
    } catch (err) {
      showToast(`Reject failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reorder Approval
  const handleAcceptReorder = async (id) => {
    try {
      setIsLoading(true);
      const res = await actOnReorderSuggestion(id, 'ACCEPT');
      showToast(res.message, 'success');
      await loadData();
    } catch (err) {
      showToast(`Accept failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectReorder = async (id) => {
    try {
      setIsLoading(true);
      await actOnReorderSuggestion(id, 'REJECT');
      showToast('Reorder suggestion rejected', 'info');
      await loadData();
    } catch (err) {
      showToast(`Reject failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // On-demand calls
  const handleRequestPricing = async (id) => {
    try {
      setIsLoading(true);
      await requestPricingSuggestion(id, 'MANUAL');
      showToast('On-demand pricing suggestion generated', 'success');
      await loadData();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReorder = async (id) => {
    try {
      setIsLoading(true);
      await requestReorderSuggestion(id, 'MANUAL');
      showToast('On-demand reorder suggestion generated', 'success');
      await loadData();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Walkthrough Demos
  const handleRunLowStockDemo = async () => {
    // PRD-003 (T-Shirt): Stock 8, Threshold 15 -> order 2 units -> stock drops to 6
    await handleSimulateOrder('PRD-003', 2);
  };

  const handleRunSpikeDemo = async () => {
    // PRD-008 (Hoodie): High velocity item -> order 8 units
    await handleSimulateOrder('PRD-008', 8);
  };

  return (
    <div className="app-container">
      {/* Toast Feedback */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor:
              toast.type === 'error'
                ? '#e11d48'
                : toast.type === 'success'
                ? '#059669'
                : '#4b5563',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            zIndex: 9999,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Masthead Navbar */}
      <Navbar
        activeStrategy={activeStrategy}
        onStrategyChange={handleStrategyChange}
        onReseed={handleReseed}
        isRefreshing={isLoading}
      />

      {/* Evaluation Walkthrough Banner */}
      <DemoWalkthrough
        onRunLowStockDemo={handleRunLowStockDemo}
        onRunSpikeDemo={handleRunSpikeDemo}
        onOpenStreamModal={(id) => setStreamModalProductId(id)}
      />

      {/* Metrics Score Strip */}
      <ScoreStrip stats={stats} />

      {/* Pending Human Approval Queue (Agentic Checkpoint) */}
      <div className="section-rule">
        <div className="section-rule-label">
          <span>Human-in-the-Loop Approval Queue</span>
          <span className="section-rule-count">
            {pricingSuggestions.length + reorderSuggestions.length} Pending
          </span>
        </div>
        <div className="section-rule-line" />
      </div>

      <SuggestionsQueue
        pricingSuggestions={pricingSuggestions}
        reorderSuggestions={reorderSuggestions}
        productsMap={productsMap}
        onAcceptPricing={handleAcceptPricing}
        onRejectPricing={handleRejectPricing}
        onAcceptReorder={handleAcceptReorder}
        onRejectReorder={handleRejectReorder}
        isLoading={isLoading}
      />

      {/* Product Catalog & Simulation Board */}
      <div className="section-rule">
        <div className="section-rule-label">
          <span>Catalog &amp; Inventory Controller</span>
          <span className="section-rule-count">{products.length} Products</span>
        </div>
        <div className="section-rule-line" />
      </div>

      <CatalogBoard
        products={products}
        onSimulateOrder={handleSimulateOrder}
        onUpdateStock={handleUpdateStock}
        onRequestPricing={handleRequestPricing}
        onRequestReorder={handleRequestReorder}
        onOpenStreamModal={(id) => setStreamModalProductId(id)}
        isLoading={isLoading}
      />

      {/* Live SSE Token Stream Modal */}
      {streamModalProductId && (
        <AIStreamModal
          productId={streamModalProductId}
          onClose={() => setStreamModalProductId(null)}
          onRefreshData={loadData}
        />
      )}
    </div>
  );
}
