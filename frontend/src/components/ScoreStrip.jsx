import React from 'react';
import { Package, Clock, AlertTriangle, Flame, DollarSign } from 'lucide-react';

export default function ScoreStrip({ stats }) {
  const pendingTotal = (stats?.pendingPricingCount || 0) + (stats?.pendingReorderCount || 0);

  return (
    <div className="score-strip">
      <div className={`score-cell ${pendingTotal > 0 ? 'highlight-cell' : ''}`}>
        <div className="score-num accent">
          <Clock size={20} />
          {pendingTotal}
        </div>
        <div className="score-label">Decisions Waiting For You</div>
      </div>

      <div className="score-cell">
        <div className="score-num amber">
          <AlertTriangle size={20} />
          {stats?.lowStockAlerts ?? 0}
        </div>
        <div className="score-label">Items Running Low</div>
      </div>

      <div className="score-cell">
        <div className="score-num purple">
          <Flame size={20} />
          {stats?.demandSpikeAlerts ?? 0}
        </div>
        <div className="score-label">Viral / Fast Sellers</div>
      </div>

      <div className="score-cell">
        <div className="score-num teal">
          <Package size={20} />
          {stats?.activeProducts ?? 0} <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>/ {stats?.totalProducts ?? 0}</span>
        </div>
        <div className="score-label">Active In Stock</div>
      </div>

      <div className="score-cell">
        <div className="score-num" style={{ fontSize: 22 }}>
          <DollarSign size={18} style={{ color: 'var(--accent-terracotta)' }} />
          {stats?.totalInventoryValue ? Number(stats.totalInventoryValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
        </div>
        <div className="score-label">Inventory Value</div>
      </div>
    </div>
  );
}
