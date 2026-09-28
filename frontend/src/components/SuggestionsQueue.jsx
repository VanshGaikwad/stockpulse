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
  HelpCircle,
  ShieldCheck,
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
            <AlertTriangle size={12} />
            ⚠️ Low Stock Alert
          </span>
        );
      case 'DEMAND_SPIKE':
        return (
          <span className="badge badge-demand-spike">
            <Flame size={12} />
            🔥 Sales Surge Alert
          </span>
        );
      default:
        return (
          <span className="badge badge-manual">
            <UserCheck size={12} />
            ✨ On-Demand Request
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
        <PackageCheck size={36} style={{ margin: '0 auto 12px', color: 'var(--accent-teal)', opacity: 0.8 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4 }}>
          🎉 Everything is Running Smoothly!
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-secondary)', maxWidth: 500, margin: '0 auto' }}>
          No pending price changes or restock orders. Whenever an item's stock runs low or sales spike, the AI will post recommendations right here for you to approve.
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent-terracotta)', fontWeight: 500 }}>
          👇 Scroll down to the catalog and click "🛒 Sell 1" or "⚡ Viral Surge" to test it!
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={18} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
          <strong>Your Decision Needed:</strong> The AI calculated these suggestions to protect your remaining stock and optimize revenue. Click <strong style={{ color: '#34d399' }}>Accept</strong> to apply or <strong style={{ color: '#fb7185' }}>Reject</strong> to keep current values.
        </div>
      </div>

      <div className="suggestions-grid">
        {/* Pricing Suggestions */}
        {pricingSuggestions.map((item) => {
          const product = productsMap[item.productId] || {};
          const currentP = Number(item.currentPrice);
          const newP = Number(item.recommendedPrice);
          const pctDiff = currentP ? Math.round(((newP - currentP) / currentP) * 100) : 0;

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
                  <span className="product-name-heading">{product.name || 'Store Item'}</span>
                </div>
                <div>{renderTriggerBadge(item.triggerReason)}</div>
              </div>

              <div className="recommendation-diff">
                <div className="diff-side">
                  <span className="diff-label">Current Price</span>
                  <span className="diff-value">${currentP.toFixed(2)}</span>
                </div>

                <div className="diff-arrow">
                  {getDirectionIcon(item.direction)}
                  <span style={{ fontWeight: 600 }}>{pctDiff >= 0 ? `+${pctDiff}%` : `${pctDiff}%`}</span>
                </div>

                <div className="diff-side" style={{ textAlign: 'right' }}>
                  <span className="diff-label">AI Suggested Price</span>
                  <span className="diff-value new-target">${newP.toFixed(2)}</span>
                </div>
              </div>

              <div className="reasoning-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-terracotta)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Sparkles size={13} />
                    AI Pricing Rationale:
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                    {Math.round((item.confidence || 0.85) * 100)}% Confidence
                  </span>
                </div>
                <div style={{ color: 'var(--ink-primary)', fontSize: 13 }}>{item.reasoning}</div>
              </div>

              <div className="card-actions">
                <button
                  className="btn btn-success"
                  onClick={() => onAcceptPricing(item.id)}
                  disabled={isLoading}
                  title={`Update live price to $${newP.toFixed(2)}`}
                >
                  <Check size={14} />
                  Accept &amp; Set Price to ${newP.toFixed(2)}
                </button>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onRejectPricing(item.id)}
                  disabled={isLoading}
                  title="Keep current price"
                >
                  <X size={14} />
                  Keep ${currentP.toFixed(2)}
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
                  <span className="product-name-heading">{product.name || 'Store Item'}</span>
                </div>
                <div>{renderTriggerBadge(item.triggerReason)}</div>
              </div>

              <div className="recommendation-diff">
                <div className="diff-side">
                  <span className="diff-label">Stock Left</span>
                  <span className="diff-value" style={{ color: 'var(--accent-amber)' }}>{item.currentStock} units</span>
                </div>

                <div className="diff-arrow">
                  <Clock size={14} style={{ color: 'var(--accent-teal)' }} />
                  <span>Restock</span>
                </div>

                <div className="diff-side" style={{ textAlign: 'right' }}>
                  <span className="diff-label">Suggested Order</span>
                  <span className="diff-value new-reorder">+{item.recommendedQuantity} units</span>
                </div>
              </div>

              <div className="reasoning-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} />
                    Restock Rationale (~{item.suggestedLeadTimeDays || 7} Days Lead Time):
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                    {Math.round((item.confidence || 0.8) * 100)}% Confidence
                  </span>
                </div>
                <div style={{ color: 'var(--ink-primary)', fontSize: 13 }}>{item.reasoning}</div>
              </div>

              <div className="card-actions">
                <button
                  className="btn btn-success"
                  onClick={() => onAcceptReorder(item.id)}
                  disabled={isLoading}
                  title="Approve restock order"
                >
                  <Check size={14} />
                  Approve Restock (+{item.recommendedQuantity} units)
                </button>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onRejectReorder(item.id)}
                  disabled={isLoading}
                  title="Decline restock"
                >
                  <X size={14} />
                  Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
