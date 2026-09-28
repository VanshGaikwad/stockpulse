import React from 'react';
import { Activity, RotateCcw, Cpu, Sparkles, Sliders } from 'lucide-react';

export default function Navbar({ activeStrategy, onStrategyChange, onReseed, isRefreshing }) {
  return (
    <header className="header">
      <div className="brand-wrapper">
        <div className="brand-icon-box">
          <Activity size={24} />
        </div>
        <div>
          <div className="brand-subtitle">Solo Hackathon · Commerce Engine</div>
          <h1 className="brand-title">Stock<em>Pulse</em></h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Runtime Strategy Switcher */}
        <div className="strategy-badge-control" title="Runtime Strategy Switcher (No server restart)">
          <span className="strategy-label">Engine:</span>
          <button
            className={`strategy-btn ${activeStrategy === 'rule-based' ? 'active' : ''}`}
            onClick={() => onStrategyChange('rule-based')}
          >
            <Sliders size={12} style={{ display: 'inline', marginRight: 4 }} />
            Rules
          </button>
          <button
            className={`strategy-btn ${activeStrategy === 'ai-gemini' ? 'active' : ''}`}
            onClick={() => onStrategyChange('ai-gemini')}
          >
            <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
            Gemini
          </button>
          <button
            className={`strategy-btn ${activeStrategy === 'hybrid' ? 'active' : ''}`}
            onClick={() => onStrategyChange('hybrid')}
          >
            <Cpu size={12} style={{ display: 'inline', marginRight: 4 }} />
            Hybrid
          </button>
        </div>

        {/* Reseed Database Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onReseed}
          title="Reset catalog back to initial 8 products"
        >
          <RotateCcw size={13} className={isRefreshing ? 'spin' : ''} />
          Reseed Data
        </button>
      </div>
    </header>
  );
}
