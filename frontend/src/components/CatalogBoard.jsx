import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Zap,
  Sparkles,
  PackagePlus,
  AlertTriangle,
  Flame,
  ArrowUpDown,
} from 'lucide-react';

export default function CatalogBoard({
  products,
  onSimulateOrder,
  onUpdateStock,
  onRequestPricing,
  onRequestReorder,
  onOpenStreamModal,
  isLoading,
}) {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = products.filter((prod) => {
    const matchesCat = categoryFilter === 'ALL' || prod.category === categoryFilter;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'LOW_STOCK') {
      matchesStatus = prod.stockLevel < prod.reorderThreshold;
    } else if (statusFilter === 'SPIKE') {
      matchesStatus = prod.demandVelocity > 10;
    } else if (statusFilter === 'PENDING') {
      matchesStatus = prod.status === 'PRICE_REVIEW_PENDING';
    }

    return matchesCat && matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRICE_REVIEW_PENDING':
        return <span className="badge badge-review">Review Pending</span>;
      case 'OUT_OF_STOCK':
        return <span className="badge badge-out-of-stock">Out of Stock</span>;
      default:
        return <span className="badge badge-active">Active</span>;
    }
  };

  const handleStockPrompt = (prod) => {
    const current = prod.stockLevel;
    const input = prompt(`Enter new stock level for ${prod.name}:`, current);
    if (input !== null && !isNaN(Number(input))) {
      onUpdateStock(prod.id, Number(input));
    }
  };

  return (
    <div>
      <div className="filter-bar">
        {/* Category Tabs */}
        <div className="filter-group">
          {['ALL', 'ELECTRONICS', 'APPAREL', 'HOME'].map((cat) => (
            <button
              key={cat}
              className={`filter-tab ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status / Alert Filter */}
        <div className="filter-group">
          <button
            className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Conditions
          </button>
          <button
            className={`filter-tab ${statusFilter === 'LOW_STOCK' ? 'active' : ''}`}
            onClick={() => setStatusFilter('LOW_STOCK')}
          >
            <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4, color: 'var(--accent-amber)' }} />
            Low Stock
          </button>
          <button
            className={`filter-tab ${statusFilter === 'SPIKE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('SPIKE')}
          >
            <Flame size={11} style={{ display: 'inline', marginRight: 4, color: 'var(--accent-purple)' }} />
            Demand Spikes
          </button>
          <button
            className={`filter-tab ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
          >
            Pending Review
          </button>
        </div>

        {/* Search Input */}
        <div>
          <input
            type="text"
            className="search-input"
            placeholder="Search SKU or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Catalog Table */}
      <div className="catalog-table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Category</th>
              <th>Current Price</th>
              <th>Stock / Threshold</th>
              <th>24h Velocity</th>
              <th>Status</th>
              <th>Simulate &amp; Test</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((prod) => {
              const isLow = prod.stockLevel < prod.reorderThreshold;
              const isSpike = prod.demandVelocity > 10;

              return (
                <tr key={prod.id}>
                  <td>
                    <div className="product-cell-main">
                      <span className="product-cell-name">{prod.name}</span>
                      <span className="product-cell-sku">{prod.sku}</span>
                    </div>
                  </td>

                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{prod.category}</span>
                  </td>

                  <td>
                    <span className="price-text">${Number(prod.currentPrice).toFixed(2)}</span>
                  </td>

                  <td>
                    <div className="stock-meter">
                      <span
                        className={`stock-value ${
                          prod.stockLevel === 0 ? 'out' : isLow ? 'low' : ''
                        }`}
                      >
                        {prod.stockLevel} units
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                        / {prod.reorderThreshold}
                      </span>
                      {isLow && (
                        <span title="Below Reorder Threshold!" style={{ color: 'var(--accent-amber)' }}>
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className={`velocity-pill ${isSpike ? 'spike' : ''}`}>
                      {isSpike && <Flame size={12} />}
                      <span>{prod.demandVelocity || 0} /day</span>
                    </div>
                  </td>

                  <td>{getStatusBadge(prod.status)}</td>

                  <td>
                    <div className="actions-cell">
                      {/* 1-click simulate order */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSimulateOrder(prod.id, 1)}
                        disabled={isLoading || prod.stockLevel === 0}
                        title="Simulate 1 sale (decrements stock, increments velocity, triggers agentic loop)"
                      >
                        <ShoppingCart size={11} />
                        Sale (1)
                      </button>

                      {/* 1-click simulate surge (5 units) */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSimulateOrder(prod.id, 5)}
                        disabled={isLoading || prod.stockLevel === 0}
                        title="Simulate surge of 5 orders"
                      >
                        <Zap size={11} style={{ color: 'var(--accent-purple)' }} />
                        Surge (5)
                      </button>

                      {/* Manual stock adjustment */}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleStockPrompt(prod)}
                        title="Directly edit stock level"
                      >
                        <ArrowUpDown size={11} />
                        Stock
                      </button>

                      {/* Live SSE Token Stream */}
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onOpenStreamModal(prod.id)}
                        title="Live Stream AI Dynamic Pricing Reasoning"
                      >
                        <Sparkles size={11} />
                        AI Stream
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
