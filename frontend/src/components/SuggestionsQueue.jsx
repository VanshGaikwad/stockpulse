import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  AlertTriangle,
  Flame,
  UserCheck,
  Sparkles,
  PackageCheck,
  Clock,
} from 'lucide-react';

export default function SuggestionsQueue({
  pricingSuggestions,
  reorderSuggestions,
  productsMap,
  onAcceptPricing,
  onRejectPricing,
  onAcceptReorder,
  onRejectReorder,
  isLoading,
}) {
  const totalPending = pricingSuggestions.length + reorderSuggestions.length;

  const renderTriggerBadge = (reason) => {
    switch (reason) {
      case 'INVENTORY_LOW':
        return (
          <span className="badge badge-low-stock">
            <AlertTriangle size={11} />
            Auto · Low Stock
          </span>
        );
      case 'DEMAND_SPIKE':
        return (
          <span className="badge badge-demand-spike">
            <Flame size={11} />
            Auto · Demand Spike
          </span>
        );
      default:
        return (
          <span className="badge badge-manual">
            <UserCheck size={11} />
            Manual Request
          </span>
        );
    }
  };

  const getDirectionIcon = (direction) => {
    if (direction === 'INCREASE') return <TrendingUp size={14} style={{ color: 'var(--accent-terracotta)' }} />;
    if (direction === 'DECREASE') return <TrendingDown size={14} style={{ color: 'var(--accent-teal)' }} />;
    return <Minus size={14} style={{ color: 'var(--ink-muted)' }} />;
  };

  if (totalPending === 0) {
    return (
      <div className="empty-state">
        <PackageCheck size={32} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
        <div>All recommendations reviewed! The human-in-the-loop queue is clear.</div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
          Simulate an order or update stock in the catalog below to trigger new autonomous recommendations.
        </div>
      </div>
    );
  }

  return (
    <div className="suggestions-grid">
      {/* Pricing Suggestions */}
      {pricingSuggestions.map((item) => {
        const product = productsMap[item.productId] || {};
        const pctDiff = item.currentPrice
          ? Math.round(((item.recommendedPrice - item.currentPrice) / item.currentPrice) * 100)
          : 0;

        return (
          <div
            key={item.id}
            className={`suggestion-card ${
              item.triggerReason === 'INVENTORY_LOW'
                ? 'inventory-low'
                : item.triggerReason === 'DEMAND_SPIKE'
                ? 'demand-spike'
                : 'manual'
            }`}
          >
            <div className="card-top">
              <div className="card-title-group">
                <span className="product-sku">{product.sku || item.productId}</span>
                <span className="product-name-heading">{product.name || 'Catalog Product'}</span>
              </div>
              <div>{renderTriggerBadge(item.triggerReason)}</div>
            </div>

            <div className="recommendation-diff">
              <div className="diff-side">
                <span className="diff-label">Current Price</span>
                <span className="diff-value">${Number(item.currentPrice).toFixed(2)}</span>
              </div>

              <div className="diff-arrow">
                {getDirectionIcon(item.direction)}
                <span>{pctDiff >= 0 ? `+${pctDiff}%` : `${pctDiff}%`}</span>
              </div>

              <div className="diff-side" style={{ textAlign: 'right' }}>
                <span className="diff-label">AI Recommended</span>
                <span className="diff-value new-target">${Number(item.recommendedPrice).toFixed(2)}</span>
              </div>
            </div>

            <div className="reasoning-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Sparkles size={12} style={{ color: 'var(--accent-terracotta)' }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>
                  Pricing Advisor ({Math.round((item.confidence || 0.85) * 100)}% Confidence)
                </span>
              </div>
              {item.reasoning}
            </div>

            <div className="card-actions">
              <button
                className="btn btn-success btn-sm"
                onClick={() => onAcceptPricing(item.id)}
                disabled={isLoading}
              >
                <Check size={13} />
                Accept & Publish Price
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onRejectPricing(item.id)}
                disabled={isLoading}
              >
                <X size={13} />
                Reject
              </button>
            </div>
          </div>
        );
      })}

      {/* Reorder Suggestions */}
      {reorderSuggestions.map((item) => {
        const product = productsMap[item.productId] || {};

        return (
          <div
            key={item.id}
            className={`suggestion-card ${
              item.triggerReason === 'INVENTORY_LOW'
                ? 'inventory-low'
                : item.triggerReason === 'DEMAND_SPIKE'
                ? 'demand-spike'
                : 'manual'
            }`}
          >
            <div className="card-top">
              <div className="card-title-group">
                <span className="product-sku">{product.sku || item.productId}</span>
                <span className="product-name-heading">{product.name || 'Catalog Product'}</span>
              </div>
              <div>{renderTriggerBadge(item.triggerReason)}</div>
            </div>

            <div className="recommendation-diff">
              <div className="diff-side">
                <span className="diff-label">Current Stock</span>
                <span className="diff-value">{item.currentStock} units</span>
              </div>

              <div className="diff-arrow">
                <PackageCheck size={14} style={{ color: 'var(--accent-teal)' }} />
                <span>Replenish</span>
              </div>

              <div className="diff-side" style={{ textAlign: 'right' }}>
                <span className="diff-label">Reorder Batch</span>
                <span className="diff-value new-reorder">+{item.recommendedQuantity} units</span>
              </div>
            </div>

            <div className="reasoning-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Clock size={12} style={{ color: 'var(--accent-teal)' }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>
                  Supply Chain Advisor · ~{item.suggestedLeadTimeDays || 7}d Lead Time ({Math.round((item.confidence || 0.8) * 100)}% Conf)
                </span>
              </div>
              {item.reasoning}
            </div>

            <div className="card-actions">
              <button
                className="btn btn-success btn-sm"
                onClick={() => onAcceptReorder(item.id)}
                disabled={isLoading}
              >
                <Check size={13} />
                Accept & Order Stock
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onRejectReorder(item.id)}
                disabled={isLoading}
              >
                <X size={13} />
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
