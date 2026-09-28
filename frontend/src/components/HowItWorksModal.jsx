import React from 'react';
import { X, ShoppingCart, Cpu, CheckCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function HowItWorksModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-icon-box" style={{ width: 34, height: 34 }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: 18 }}>How StockPulse Works</div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>The 3-step autonomous commerce loop explained simply</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, margin: '8px 0' }}>
          {/* Step 1 */}
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-amber)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>1</div>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-primary)' }}>Stock Changes</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
              Customers purchase items. When stock falls dangerously low or sales suddenly spike, StockPulse detects it automatically.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>2</div>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-primary)' }}>AI Thinks &amp; Plans</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
              The Gemini AI analyzes stock level, sales speed, and peer prices. It calculates the optimal new price and exact reorder quantity.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-teal)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>3</div>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-primary)' }}>You Decide</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
              Prices NEVER change without your approval. You simply click <strong>"Accept"</strong> to update the live price or restock inventory.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(226, 109, 61, 0.08)', border: '1px solid var(--border-highlight)', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-terracotta)', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            <ShieldCheck size={16} />
            Human-in-the-Loop Safety Guarantee
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
            The AI acts as an advisor, not a wild robot. It prepares recommendations with full plain-English explanations and confidence scores so you can review in seconds.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Got it, Let's Try It!
          </button>
        </div>
      </div>
    </div>
  );
}
