import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  HelpCircle,
  ArrowRight,
  TrendingDown,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function OnboardingGuide({
  pendingCount,
  onRunLowStockDemo,
  onRunSpikeDemo,
  onOpenHowItWorks,
  hasTriggeredSale,
  hasApprovedSuggestion,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="onboarding-guide-card">
      <div className="onboarding-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse-beacon" />
          <div>
            <h2 className="onboarding-title">
              👋 Welcome! Try StockPulse in 3 Easy Steps
            </h2>
            <p className="onboarding-subtitle">
              See how our AI automatically monitors inventory and suggests smart prices when items sell fast.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenHowItWorks}
            title="Read how the system works"
          >
            <HelpCircle size={13} style={{ color: 'var(--accent-terracotta)' }} />
            How It Works
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Show guide' : 'Hide guide'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="onboarding-steps">
          {/* Step 1 */}
          <div className={`onboarding-step-box ${hasTriggeredSale ? 'completed' : 'active'}`}>
            <div className="step-badge">
              {hasTriggeredSale ? (
                <CheckCircle2 size={16} className="step-icon-done" />
              ) : (
                <span className="step-number">1</span>
              )}
              <span className="step-heading">Cause a Stock Change</span>
            </div>
            <p className="step-text">
              Click one of the buttons below to simulate customers buying products:
            </p>
            <div className="step-actions">
              <button
                className="btn btn-secondary btn-sm step-btn"
                onClick={onRunLowStockDemo}
                title="Simulates 2 sales on T-Shirt, dropping stock from 8 to 6"
              >
                <TrendingDown size={12} style={{ color: 'var(--accent-amber)' }} />
                Buy 2 T-Shirts (Low Stock)
              </button>

              <button
                className="btn btn-secondary btn-sm step-btn"
                onClick={onRunSpikeDemo}
                title="Simulates rapid sales on Hoodie to create a sales surge"
              >
                <Flame size={12} style={{ color: 'var(--accent-purple)' }} />
                Buy 5 Hoodies (Viral Spike)
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`onboarding-step-box ${pendingCount > 0 ? 'active highlight' : ''}`}>
            <div className="step-badge">
              {pendingCount > 0 ? (
                <Sparkles size={16} style={{ color: 'var(--accent-terracotta)' }} />
              ) : (
                <span className="step-number">2</span>
              )}
              <span className="step-heading">AI Formulates Advice</span>
            </div>
            <p className="step-text">
              When an item runs low, the AI automatically creates price and replenishment recommendations in the queue below.
            </p>
            <div style={{ marginTop: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: pendingCount > 0 ? 'var(--accent-terracotta)' : 'var(--ink-muted)' }}>
              {pendingCount > 0
                ? `⚡ ${pendingCount} recommendations waiting for your decision below!`
                : '⏳ Waiting for an alert trigger...'}
            </div>
          </div>

          {/* Step 3 */}
          <div className={`onboarding-step-box ${hasApprovedSuggestion ? 'completed' : ''}`}>
            <div className="step-badge">
              {hasApprovedSuggestion ? (
                <CheckCircle2 size={16} className="step-icon-done" />
              ) : (
                <span className="step-number">3</span>
              )}
              <span className="step-heading">You Approve or Reject</span>
            </div>
            <p className="step-text">
              Prices never change on their own. Click <strong>"Accept"</strong> in the queue to update the live store price!
            </p>
            <div style={{ marginTop: 10, fontSize: 11, color: hasApprovedSuggestion ? 'var(--accent-teal)' : 'var(--ink-muted)' }}>
              {hasApprovedSuggestion ? '🎉 Price published successfully!' : '👉 Click "Accept" in the cards below'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
