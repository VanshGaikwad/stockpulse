import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { actOnPricingSuggestion } from '../api.js';

export default function AIStreamModal({ productId, onClose, onRefreshData }) {
  const [streamText, setStreamText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!productId) return;

    setStreamText('');
    setIsStreaming(true);
    setRecommendation(null);
    setError(null);

    const eventSource = new EventSource(`http://localhost:8081/products/${productId}/suggest-pricing/stream?trigger=MANUAL`);

    eventSource.addEventListener('start', (e) => {
      const data = JSON.parse(e.data);
      setProductDetails(data);
    });

    eventSource.addEventListener('token', (e) => {
      const data = JSON.parse(e.data);
      setStreamText((prev) => prev + data.text);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setRecommendation(data.recommendation);
      setIsStreaming(false);
      eventSource.close();
      onRefreshData?.();
    });

    eventSource.addEventListener('error', (e) => {
      console.warn('SSE Stream error/ended', e);
      setIsStreaming(false);
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [productId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="pulse-beacon" />
            <div className="modal-title">Live AI Reasoning Stream</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {productDetails && (
          <div style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
            Evaluating <strong style={{ color: 'var(--ink-primary)' }}>{productDetails.productName}</strong> ({productDetails.productId}) · Current: <strong>${Number(productDetails.currentPrice).toFixed(2)}</strong> · Engine: <strong>{productDetails.strategy}</strong>
          </div>
        )}

        <div className="token-stream-box" ref={scrollRef}>
          {streamText}
          {isStreaming && <span className="cursor-blink" />}
          {!streamText && isStreaming && (
            <span style={{ color: 'var(--ink-muted)' }}>Initiating reasoning stream from Commerce Engine...</span>
          )}
        </div>

        {recommendation && (
          <div className="recommendation-diff" style={{ marginTop: 6 }}>
            <div className="diff-side">
              <span className="diff-label">Recommended Price</span>
              <span className="diff-value new-target">${Number(recommendation.recommendedPrice).toFixed(2)}</span>
            </div>
            <div className="diff-arrow">
              <Sparkles size={14} style={{ color: 'var(--accent-terracotta)' }} />
              <span>{recommendation.direction}</span>
            </div>
            <div className="diff-side" style={{ textAlign: 'right' }}>
              <span className="diff-label">Confidence</span>
              <span className="diff-value">{Math.round((recommendation.confidence || 0.85) * 100)}%</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
