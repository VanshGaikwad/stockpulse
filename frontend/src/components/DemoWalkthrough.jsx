import React from 'react';
import { AlertCircle, Flame, Sparkles, ShoppingBag } from 'lucide-react';

export default function DemoWalkthrough({ onRunLowStockDemo, onRunSpikeDemo, onOpenStreamModal }) {
  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <div className="pulse-beacon" />
        <div>
          <div className="demo-title">Agentic Commerce Evaluation Walkthrough</div>
          <div className="demo-desc">
            Test the autonomous observe → reason → recommend → human approval loop with 1-click test scenarios:
          </div>
        </div>
      </div>

      <div className="demo-buttons">
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRunLowStockDemo}
          title="Simulate sales on PRD-003 until stock drops below threshold (15) to trigger INVENTORY_LOW recommendations"
        >
          <AlertCircle size={13} style={{ color: 'var(--accent-amber)' }} />
          Path 1: Low Stock (PRD-003)
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onRunSpikeDemo}
          title="Simulate sales surge on PRD-008 to trigger DEMAND_SPIKE recommendations"
        >
          <Flame size={13} style={{ color: 'var(--accent-purple)' }} />
          Path 2: Demand Spike (PRD-008)
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => onOpenStreamModal('PRD-001')}
          title="Stream AI pricing reasoning live token-by-token via Server-Sent Events"
        >
          <Sparkles size={13} />
          SSE Token Stream (+5 pts)
        </button>
      </div>
    </div>
  );
}
