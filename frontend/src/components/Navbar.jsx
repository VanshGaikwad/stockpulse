import React from 'react';
import { Activity, RotateCcw, Cpu, Sparkles, Sliders, HelpCircle } from 'lucide-react';

export default function Navbar({
  activeStrategy,
  onStrategyChange,
  onReseed,
  onOpenHowItWorks,
  isRefreshing,
}) {
  return (
    <header className="header">
      <div className="brand-wrapper">
        <div className="brand-icon-box">
          <Activity size={24} />
        </div>
        <div>
          <div className="brand-subtitle">Smart Inventory &amp; Dynamic Pricing</div>
          <h1 className="brand-title">Stock<em>Pulse</em></h1>
        </div>
      </div>

      <div className="header-actions">
        {/* How It Works Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenHowItWorks}
          title="See simple 3-step explanation of how StockPulse works"
        >
          <HelpCircle size={13} style={{ color: 'var(--accent-terracotta)' }} />
          How It Works
        </button>

        {/* Runtime Strategy Switcher */}
        <div className="strategy-badge-control" title="Choose which engine makes price recommendations">
          <span className="strategy-label">AI Engine:</span>
          <button
            className={`strategy-btn ${activeStrategy === 'rule-based' ? 'active' : ''}`}
            onClick={() => onStrategyChange('rule-based')}
            title="Use standard business rules"
          >
            <Sliders size={12} style={{ display: 'inline', marginRight: 4 }} />
            Rules
          </button>
          <button
            className={`strategy-btn ${activeStrategy === 'ai-gemini' ? 'active' : ''}`}
            onClick={() => onStrategyChange('ai-gemini')}
            title="Use Google Gemini LLM"
          >
            <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
            Gemini
          </button>
          <button
            className={`strategy-btn ${activeStrategy === 'hybrid' ? 'active' : ''}`}
            onClick={() => onStrategyChange('hybrid')}
            title="Smart Hybrid: uses Gemini AI with automatic rule backup"
          >
            <Cpu size={12} style={{ display: 'inline', marginRight: 4 }} />
            Hybrid
          </button>
        </div>

        {/* Reseed Database Button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={onReseed}
          title="Reset products and stock back to starting sample data"
        >
          <RotateCcw size={13} className={isRefreshing ? 'spin' : ''} />
          Reset Demo Data
        </button>
      </div>
    </header>
  );
}
