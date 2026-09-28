# Architecture Decision Record (ADR) — StockPulse

**Project:** StockPulse AI Inventory & Dynamic Pricing Engine  
**Author:** Solo Hackathon Engineer  
**Date:** September 2026  
**Status:** Approved & Implemented  

---

## 1. Where Commerce Logic Lives

### Context
In reactive e-commerce applications, business rules (pricing thresholds, demand elasticity calculations, replenishment logic, and event dispatch) can easily become entangled across controller handlers, database models, or monolithic service classes, causing high coupling and fragility.

### Options
1. **Domain Model Entity Methods:** Encapsulate pricing and reorder logic directly inside the `Product` entity.
2. **Controller/Route Layer:** Handle pricing decisions directly inside HTTP route handlers.
3. **Dedicated Strategy & Advisor Layer:** Decouple pricing and replenishment into standalone strategy classes (`CommerceStrategy`, `RuleBasedStrategy`, `AIGeminiStrategy`) coordinated by a `StrategyManager` and executed via an asynchronous `AgenticRecommendationLoop`.

### Decision
We chose **Option 3: Dedicated Strategy & Advisor Layer**. The route handlers remain thin HTTP adapters. The domain entities represent pure state, while business calculations, LLM prompt engineering, and deterministic fallback logic live inside isolated strategy implementations conforming to the `CommerceStrategy` interface.

### Tradeoffs
- **Gained:** High modularity, testability in isolation, zero-downtime strategy swapping, and seamless introduction of Sprint 2 extensions (e.g., `CompetitorAwareStrategy`).
- **Cost:** Introduces additional interface abstractions and coordinator files instead of writing direct imperative code.

---

## 2. Unified AI Contract vs. Separate Pricing & Reorder Calls

### Context
When inventory drops or velocity spikes, the engine must generate both a **Pricing Recommendation** (protect stock or discount) and a **Reorder Recommendation** (units to replenish and supplier lead time).

### Options
1. **Single Unified AI Call:** Send one prompt and receive a combined JSON containing both pricing and replenishment recommendations.
2. **Strictly Independent AI Calls:** Separate pricing analysis and replenishment planning into two distinct AI executions with dedicated prompts.
3. **Hybrid Composition:** Unified coordinator interface (`generateUnifiedSuggestions`) composed of distinct specialized prompt methods (`_buildPricingPrompt` vs `_buildReorderPrompt`).

### Decision
We chose **Option 3: Specialized Prompts with Modular Execution**. We constructed two fundamentally different prompts:
- **Pricing Prompt:** Analyzes price elasticity, margin tradeoffs, and stockout run-out days (whether to raise prices to ration remaining inventory or clearance to maintain momentum).
- **Replenishment Prompt:** Analyzes safety buffers, batch economics, lead time risk, and target inventory turns.

### Tradeoffs
- **Gained:** Avoids "prompt pollution" where competing objectives degrade LLM reasoning quality. Allows partial success: if reorder succeeds but pricing requires fallback, they fail independently.
- **Cost:** Slightly higher token consumption than a single combined prompt.

---

## 3. Runtime Strategy Switching Mechanism

### Context
Merchandising teams must be able to switch between deterministic rule-based algorithms, cutting-edge LLMs (Gemini), and resilient hybrid fallbacks in production without code redeployments or server restarts.

### Options
1. **Application Restart via `.env`:** Read strategy once at process startup; changes require process termination and reboot.
2. **Dynamic Strategy Registry (`StrategyManager`):** Maintain a runtime map of registered strategies with an active strategy pointer switchable via `POST /config/strategy`.

### Decision
We chose **Option 2: Dynamic Strategy Registry (`StrategyManager`)**. The `StrategyManager` registers all strategies (`rule-based`, `ai-gemini`, `hybrid`) upon boot. HTTP endpoints and background event listeners both obtain the active strategy dynamically via `strategyManager.getActiveStrategy()`.

### Tradeoffs
- **Gained:** Zero-downtime switching, live interactive testing from the UI console, and instant rollback capability during LLM outages.
- **Cost:** Requires concurrency-safe state access.

---

## 4. LLM Failure Handling, Bounds Validation & Fallbacks

### Context
External LLM APIs (Gemini) can suffer from rate limits, network timeouts, malformed JSON outputs, or hallucinations yielding negative or absurdly inflated prices (e.g. $0 or $999,999).

### Options
1. **Fail-Fast / Error Response:** Return HTTP 500 or drop suggestions if the LLM call errors out.
2. **Retry Loop with Exponential Backoff:** Retry failed LLM calls up to 3 times before failing.
3. **Fail-Safe Deterministic Fallback with Sanity Clamping:** Validate outputs against strict boundary guardrails; on any network timeout (8s timeout cap), quota exhaustion, or parsing failure, automatically fall back to `RuleBasedStrategy` and append diagnostic reasoning.

### Decision
We chose **Option 3: Guardrail Clamping with Deterministic Rule Fallback**.
- **Sanity Bounds:** Recommended price is capped between `0.20 × currentPrice` and `5.00 × currentPrice`. Reorder quantity must be an integer between 1 and 5,000.
- **Resilience:** If Gemini fails, `RuleBasedStrategy` is executed immediately, tagging the suggestion with `[AI Fallback: <reason>]`.

### Tradeoffs
- **Gained:** 100% system availability. Merchandisers are never left with silent drops or broken queues.
- **Cost:** Fallback suggestions may lack the nuanced contextual prose of a healthy LLM call.

---

## 5. Agentic Loop Decoupling & Idempotency

### Context
When sales orders arrive or warehouse stock is adjusted, inventory thresholds can be breached. Running heavy AI reasoning synchronously in the stock/order HTTP handler would introduce 2-5 second latency to checkout requests. Furthermore, rapid consecutive orders could flood the queue with redundant suggestions.

### Options
1. **Synchronous Execution:** Compute recommendations directly in the `POST /orders` thread.
2. **Scheduled Polling Cron:** A background job running every 60 seconds scanning the database for low-stock products.
3. **Event-Driven Asynchronous Pipeline with Idempotency Guard:** Decouple via Node.js `EventEmitter` / `setImmediate`. The HTTP response returns in <30ms; the recommendation pipeline executes asynchronously. Idempotency guards check for existing `PENDING` suggestions with the same `productId` and `triggerReason`.

### Decision
We chose **Option 3: Event-Driven Asynchronous Pipeline with Idempotency Guard**.
- Stock and order requests return immediately.
- The `AgenticRecommendationLoop` listens for `STOCK_SIGNAL` and `DEMAND_SIGNAL`.
- If a `PENDING` suggestion already exists for that product and trigger type, redundant runs are discarded.

### Tradeoffs
- **Gained:** Sub-50ms API response times, zero redundant queue clutter, and authentic event-driven behavior instead of timer polling.
- **Cost:** Requires client UI polling or reactive listeners to display newly created suggestions.

---

## 6. Extensibility Seams (Sprint 2 Roadmap) & Deliberate Exclusions

### Context
The hackathon brief outlines Sprint 2 requirements: competitor pricing, supplier catalogs, margin floors, and price change cooldowns.

### Extensibility Seams in Code
1. **Sprint 2 Entity Seams:** `Product` schema in both Firestore and seed data contains placeholders:
   - `costPrice`: Base unit acquisition cost for margin calculation.
   - `marginFloor`: Minimum acceptable gross margin (e.g. 0.25 = 25%) ensuring AI never recommends price below cost floor.
   - `supplierId`: Preferred supplier identifier for automated purchase orders.
2. **Strategy Extension Point:** `strategyManager.registerStrategy(name, instance)` allows adding `CompetitorAwareStrategy` in Sprint 2 without modifying a single line of existing strategy code.

### Deliberate Exclusions
- **Full Storefront & Payment Processing:** Excluded per brief scope to focus 100% on the core inventory signal → AI recommendation → human approval loop.
- **Automated Purchase Order Dispatch:** Reorder acceptance currently simulates inbound stock arrival rather than calling live supplier EDI/APIs (deferred to Sprint 3).
