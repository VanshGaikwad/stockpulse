import { v4 as uuidv4 } from 'uuid';
import { getDb, Collections } from '../config/firebase.js';
import { SuggestionStatus, ProductStatus } from '../models/types.js';

export class SuggestionService {
  get pricingCollection() {
    return getDb().collection(Collections.PRICING_SUGGESTIONS);
  }

  get reorderCollection() {
    return getDb().collection(Collections.REORDER_SUGGESTIONS);
  }

  get productCollection() {
    return getDb().collection(Collections.PRODUCTS);
  }

  async createPricingSuggestion(data) {
    const id = data.id || `PSG-${uuidv4().substring(0, 8).toUpperCase()}`;
    const suggestion = {
      id,
      productId: data.productId,
      currentPrice: Number(data.currentPrice),
      recommendedPrice: Number(data.recommendedPrice),
      direction: data.direction || 'HOLD',
      confidence: Number(data.confidence) || 0.85,
      reasoning: data.reasoning || '',
      status: SuggestionStatus.PENDING,
      triggerReason: data.triggerReason || 'MANUAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.pricingCollection.doc(id).set(suggestion);

    // Update product lifecycle to PRICE_REVIEW_PENDING
    await this.productCollection.doc(data.productId).update({
      status: ProductStatus.PRICE_REVIEW_PENDING,
      updatedAt: new Date().toISOString(),
    });

    return suggestion;
  }

  async createReorderSuggestion(data) {
    const id = data.id || `RSG-${uuidv4().substring(0, 8).toUpperCase()}`;
    const suggestion = {
      id,
      productId: data.productId,
      currentStock: Number(data.currentStock),
      recommendedQuantity: Number(data.recommendedQuantity),
      suggestedLeadTimeDays: Number(data.suggestedLeadTimeDays) || 7,
      confidence: Number(data.confidence) || 0.80,
      reasoning: data.reasoning || '',
      status: SuggestionStatus.PENDING,
      triggerReason: data.triggerReason || 'MANUAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.reorderCollection.doc(id).set(suggestion);
    return suggestion;
  }

  async getPricingSuggestions({ productId, status } = {}) {
    let query = this.pricingCollection;
    if (productId) {
      query = query.where('productId', '==', productId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getReorderSuggestions({ productId, status } = {}) {
    let query = this.reorderCollection;
    if (productId) {
      query = query.where('productId', '==', productId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async hasPendingSuggestion(productId, triggerReason, type = 'pricing') {
    const col = type === 'pricing' ? this.pricingCollection : this.reorderCollection;
    const snapshot = await col
      .where('productId', '==', productId)
      .where('status', '==', SuggestionStatus.PENDING)
      .where('triggerReason', '==', triggerReason)
      .get();
    return !snapshot.empty;
  }

  async acceptPricingSuggestion(id) {
    const docRef = this.pricingCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Pricing suggestion ${id} not found`);
    }
    const suggestion = doc.data();
    if (suggestion.status !== SuggestionStatus.PENDING) {
      throw new Error(`Suggestion is already ${suggestion.status}`);
    }

    // 1. Update suggestion status to ACCEPTED
    await docRef.update({
      status: SuggestionStatus.ACCEPTED,
      acceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Side effect: Atomically update Product.currentPrice
    const productRef = this.productCollection.doc(suggestion.productId);
    const productDoc = await productRef.get();
    if (productDoc.exists) {
      const prod = productDoc.data();
      const newStatus = prod.stockLevel === 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE;
      await productRef.update({
        currentPrice: suggestion.recommendedPrice,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      id,
      ...suggestion,
      status: SuggestionStatus.ACCEPTED,
    };
  }

  async rejectPricingSuggestion(id) {
    const docRef = this.pricingCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Pricing suggestion ${id} not found`);
    }
    const suggestion = doc.data();

    await docRef.update({
      status: SuggestionStatus.REJECTED,
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Check if other pending suggestions exist for this product
    await this._checkAndRestoreProductStatus(suggestion.productId);

    return {
      id,
      ...suggestion,
      status: SuggestionStatus.REJECTED,
    };
  }

  async acceptReorderSuggestion(id) {
    const docRef = this.reorderCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Reorder suggestion ${id} not found`);
    }
    const suggestion = doc.data();
    if (suggestion.status !== SuggestionStatus.PENDING) {
      throw new Error(`Suggestion is already ${suggestion.status}`);
    }

    // 1. Update suggestion status to ACCEPTED
    await docRef.update({
      status: SuggestionStatus.ACCEPTED,
      acceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Side effect: Simulate inbound shipment by incrementing Product.stockLevel
    const productRef = this.productCollection.doc(suggestion.productId);
    const productDoc = await productRef.get();
    if (productDoc.exists) {
      const prod = productDoc.data();
      const newStock = Number(prod.stockLevel || 0) + Number(suggestion.recommendedQuantity);
      const newStatus = newStock > 0 ? ProductStatus.ACTIVE : prod.status;
      await productRef.update({
        stockLevel: newStock,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      id,
      ...suggestion,
      status: SuggestionStatus.ACCEPTED,
    };
  }

  async rejectReorderSuggestion(id) {
    const docRef = this.reorderCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Reorder suggestion ${id} not found`);
    }
    const suggestion = doc.data();

    await docRef.update({
      status: SuggestionStatus.REJECTED,
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      id,
      ...suggestion,
      status: SuggestionStatus.REJECTED,
    };
  }

  async _checkAndRestoreProductStatus(productId) {
    const pendingPricing = await this.pricingCollection
      .where('productId', '==', productId)
      .where('status', '==', SuggestionStatus.PENDING)
      .get();

    if (pendingPricing.empty) {
      const productRef = this.productCollection.doc(productId);
      const productDoc = await productRef.get();
      if (productDoc.exists) {
        const prod = productDoc.data();
        const activeStatus = prod.stockLevel === 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE;
        await productRef.update({ status: activeStatus });
      }
    }
  }
}

export const suggestionService = new SuggestionService();
