import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar.jsx';
import OnboardingGuide from './components/OnboardingGuide.jsx';
import HowItWorksModal from './components/HowItWorksModal.jsx';
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
} from './api.js';

export default function App() {
  const [products, setProducts] = useState([]);
  const [pricingSuggestions, setPricingSuggestions] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState('hybrid');
  const [streamModalProductId, setStreamModalProductId] = useState(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Gamified onboarding guide state
  const [hasTriggeredSale, setHasTriggeredSale] = useState(false);
  const [hasApprovedSuggestion, setHasApprovedSuggestion] = useState(false);

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
      showToast(`Switched to "${strategy.toUpperCase()}" engine`, 'success');
      loadData();
    } catch (err) {
      showToast(`Strategy switch error: ${err.message}`, 'error');
    }
  };

  // Reseed catalog
  const handleReseed = async () => {
    try {
      setIsLoading(true);
      await reseedDatabase();
      setHasTriggeredSale(false);
      setHasApprovedSuggestion(false);
      await loadData();
      showToast('Catalog reset back to original 8 sample products', 'success');
    } catch (err) {
      showToast(`Reset error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate Order
  const handleSimulateOrder = async (productId, quantity = 1) => {
    try {
      setIsLoading(true);
      setHasTriggeredSale(true);
      const res = await simulateOrder(productId, quantity);
      showToast(res.message || `Customer purchased ${quantity} unit(s)!`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Order simulation failed: ${err.message}`, 'error');
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
      setHasApprovedSuggestion(true);
      showToast(res.message, 'success');
      await loadData();
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectPricing = async (id) => {
    try {
      setIsLoading(true);
      await actOnPricingSuggestion(id, 'REJECT');
      showToast('Suggestion declined. Current price kept.', 'info');
      await loadData();
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reorder Approval
  const handleAcceptReorder = async (id) => {
    try {
      setIsLoading(true);
      const res = await actOnReorderSuggestion(id, 'ACCEPT');
      setHasApprovedSuggestion(true);
      showToast(res.message, 'success');
      await loadData();
    } catch (err) {
      showToast(`Restock approval failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectReorder = async (id) => {
    try {
      setIsLoading(true);
      await actOnReorderSuggestion(id, 'REJECT');
      showToast('Restock order declined.', 'info');
      await loadData();
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Guided Demos
  const handleRunLowStockDemo = async () => {
    // PRD-003: Cotton T-Shirt (Stock 8 -> order 2 -> stock 6 < threshold 15)
    await handleSimulateOrder('PRD-003', 2);
  };

  const handleRunSpikeDemo = async () => {
    // PRD-008: Hoodie (Order 5 units -> triggers spike)
    await handleSimulateOrder('PRD-008', 5);
  };

  const totalPending = pricingSuggestions.length + reorderSuggestions.length;

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
                : '#374151',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontSize: 13,
            fontWeight: 500,
            zIndex: 9999,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeStrategy={activeStrategy}
        onStrategyChange={handleStrategyChange}
        onReseed={handleReseed}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        isRefreshing={isLoading}
      />

      {/* Friendly 3-Step Interactive Onboarding */}
      <OnboardingGuide
        pendingCount={totalPending}
        onRunLowStockDemo={handleRunLowStockDemo}
        onRunSpikeDemo={handleRunSpikeDemo}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        hasTriggeredSale={hasTriggeredSale}
        hasApprovedSuggestion={hasApprovedSuggestion}
      />

      {/* Quick Overview Numbers */}
      <ScoreStrip stats={stats} />

      {/* Pending Approval Section */}
      <div className="section-rule">
        <div className="section-rule-label">
          <span>🔔 Decisions Waiting for Your Approval</span>
          <span className="section-rule-count">
            {totalPending} {totalPending === 1 ? 'Action' : 'Actions'}
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
          <span>📦 Store Catalog &amp; Interactive Simulator</span>
          <span className="section-rule-count">{products.length} Products</span>
        </div>
        <div className="section-rule-line" />
      </div>

      <CatalogBoard
        products={products}
        onSimulateOrder={handleSimulateOrder}
        onUpdateStock={handleUpdateStock}
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

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
}
