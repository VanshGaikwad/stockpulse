import { getDb, Collections } from '../config/firebase.js';
import { seedProducts } from '../data/seedData.js';
import { ProductStatus } from '../models/types.js';
import { agenticLoop } from './agenticLoop.js';

export class ProductService {
  get collection() {
    return getDb().collection(Collections.PRODUCTS);
  }

  async getAllProducts({ status, category } = {}) {
    let query = this.collection;
    if (status) {
      query = query.where('status', '==', status);
    }
    if (category) {
      query = query.where('category', '==', category);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getProductById(id) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  async createProduct(data) {
    const id = data.id || `PRD-${Date.now().toString().slice(-4)}`;
    const newProduct = {
      id,
      sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
      name: data.name,
      category: data.category || 'ELECTRONICS',
      currentPrice: Number(data.currentPrice) || 0.0,
      stockLevel: Number(data.stockLevel) || 0,
      reorderThreshold: Number(data.reorderThreshold) || 10,
      demandVelocity: Number(data.demandVelocity) || 0,
      status: Number(data.stockLevel) === 0 ? ProductStatus.OUT_OF_STOCK : (data.status || ProductStatus.ACTIVE),
      // Sprint 2 extension field placeholders
      costPrice: data.costPrice ? Number(data.costPrice) : null,
      marginFloor: data.marginFloor ? Number(data.marginFloor) : null,
      supplierId: data.supplierId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.collection.doc(id).set(newProduct);
    return newProduct;
  }

  async updateStock(id, newStock) {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }

    const parsedStock = Math.max(0, Number(newStock));
    const previousStock = product.stockLevel;
    let newStatus = product.status;

    if (parsedStock === 0) {
      newStatus = ProductStatus.OUT_OF_STOCK;
    } else if (product.status === ProductStatus.OUT_OF_STOCK && parsedStock > 0) {
      newStatus = ProductStatus.ACTIVE;
    }

    const updates = {
      stockLevel: parsedStock,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    await this.collection.doc(id).update(updates);
    const updatedProduct = { ...product, ...updates };

    // Emit event into decoupled agentic loop asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        const stats = await this.getCategoryStats(updatedProduct.category);
        agenticLoop.handleStockUpdate({
          product: updatedProduct,
          previousStock,
          categoryStats: stats,
        });
      } catch (err) {
        console.error('[AgenticLoop] Error in async stock event handler:', err);
      }
    });

    return updatedProduct;
  }

  async recordOrder(id, quantity = 1) {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }

    const qty = Math.max(1, Number(quantity));
    const previousStock = product.stockLevel;
    const newStock = Math.max(0, previousStock - qty);
    const newVelocity = Number(product.demandVelocity || 0) + qty;

    let newStatus = product.status;
    if (newStock === 0) {
      newStatus = ProductStatus.OUT_OF_STOCK;
    }

    const updates = {
      stockLevel: newStock,
      demandVelocity: newVelocity,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    await this.collection.doc(id).update(updates);
    const updatedProduct = { ...product, ...updates };

    // Emit event into decoupled agentic loop asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        const stats = await this.getCategoryStats(updatedProduct.category);
        agenticLoop.handleOrderSimulated({
          product: updatedProduct,
          previousStock,
          orderQty: qty,
          categoryStats: stats,
        });
      } catch (err) {
        console.error('[AgenticLoop] Error in async order event handler:', err);
      }
    });

    return updatedProduct;
  }

  async getCategoryStats(category) {
    const snapshot = await this.collection.where('category', '==', category).get();
    const products = snapshot.docs.map((d) => d.data());

    if (products.length === 0) {
      return { count: 0, avgPrice: 50.0, avgVelocity: 5.0 };
    }

    const totalVelocity = products.reduce((acc, p) => acc + Number(p.demandVelocity || 0), 0);
    const totalPrice = products.reduce((acc, p) => acc + Number(p.currentPrice || 0), 0);

    return {
      count: products.length,
      avgVelocity: totalVelocity / products.length,
      avgPrice: totalPrice / products.length,
    };
  }

  async seedDatabase(force = false) {
    const existing = await this.collection.get();
    if (!existing.empty && !force) {
      console.log(`[Seed] Database already contains ${existing.size} products. Skipping.`);
      return { seeded: false, count: existing.size };
    }

    console.log(`[Seed] Seeding ${seedProducts.length} baseline products from Addendum A...`);
    for (const prod of seedProducts) {
      await this.collection.doc(prod.id).set({
        ...prod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { seeded: true, count: seedProducts.length };
  }
}

export const productService = new ProductService();
