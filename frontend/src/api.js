const API_BASE = 'http://localhost:8080';

export async function fetchProducts({ status, category } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (category) params.append('category', category);
  const res = await fetch(`${API_BASE}/products?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchProductById(id) {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch product ${id}`);
  return res.json();
}

export async function updateProductStock(id, stockLevel) {
  const res = await fetch(`${API_BASE}/products/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stockLevel }),
  });
  if (!res.ok) throw new Error('Failed to update stock');
  return res.json();
}

export async function simulateOrder(id, quantity = 1) {
  const res = await fetch(`${API_BASE}/products/${id}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Failed to record simulated order');
  return res.json();
}

export async function requestPricingSuggestion(id, triggerReason = 'MANUAL') {
  const res = await fetch(`${API_BASE}/products/${id}/suggest-pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggerReason }),
  });
  if (!res.ok) throw new Error('Failed to request pricing suggestion');
  return res.json();
}

export async function requestReorderSuggestion(id, triggerReason = 'MANUAL') {
  const res = await fetch(`${API_BASE}/products/${id}/suggest-reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggerReason }),
  });
  if (!res.ok) throw new Error('Failed to request reorder suggestion');
  return res.json();
}

export async function fetchPricingSuggestions(status = 'PENDING') {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/pricing-suggestions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch pricing suggestions');
  return res.json();
}

export async function actOnPricingSuggestion(id, action) {
  const res = await fetch(`${API_BASE}/pricing-suggestions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} pricing suggestion`);
  return res.json();
}

export async function fetchReorderSuggestions(status = 'PENDING') {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/reorder-suggestions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch reorder suggestions');
  return res.json();
}

export async function actOnReorderSuggestion(id, action) {
  const res = await fetch(`${API_BASE}/reorder-suggestions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} reorder suggestion`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchStrategyConfig() {
  const res = await fetch(`${API_BASE}/config/strategy`);
  if (!res.ok) throw new Error('Failed to fetch strategy config');
  return res.json();
}

export async function setStrategyConfig(strategy) {
  const res = await fetch(`${API_BASE}/config/strategy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy }),
  });
  if (!res.ok) throw new Error('Failed to update strategy config');
  return res.json();
}

export async function reseedDatabase() {
  const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reseed database');
  return res.json();
}
