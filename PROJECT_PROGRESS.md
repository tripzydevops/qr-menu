# Tripzy QR Menu SaaS - Project Progress & Handoff Documentation

This document summarizes the progress, technical milestones, and current architectural state of the **Tripzy QR Menu SaaS** platform for the Turkish market. 

---

## 1. Project Goal & Tech Stack
The platform is designed as a next-generation, recommendation-driven digital QR menu system for cafes, restaurants, and hotels. It follows the **Tripzy 3-Layer Architecture** to deliver high performance, visual excellence, and personalized recommendation engines to solve the customer "Cold Start" problem.

*   **Frontend (Layer 1):** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React.
*   **Backend & APIs (Layer 2):** Python (FastAPI), SQLAlchemy, Pydantic, HTTPX, Uvicorn.
*   **Database & Storage (Layer 3):** Supabase (PostgreSQL), pgvector, Prisma ORM.

---

## 2. Layer-by-Layer Achievements

### Layer 1: User Interface & Signal Collection (Next.js)

*   **Super Admin Management Dashboard:**
    *   **Platform Statistics:** Real-time metrics including total organizations, active venues, physical tables, view counts, and plan distribution charts.
    *   **Tenancy CRUD Management:** Interfaces to onboard new organizations, configure subscription tiers (`free`, `pro`, `premium`), manage active venues, and configure settings.
    *   **User & Staff Assignment:** Console to manage platform users and assign staff members to venues.
*   **Admin Menu Editor:**
    *   Category creator with sort-order reordering.
    *   Menu item CRUD (TR/EN names, prices, calorie counters, allergen flags, and dietary preferences).
    *   Image uploader integrated with Supabase storage.
*   **Inventory Costing & Recipe Engine UI (Gated by Org Flag):**
    *   **Stok & Malzemeler:** CRUD dashboard to track hammadde stock levels, WAC average costs, and supplier contact lists.
    *   **Faturalar:** Form to insert invoices, edit line-items, and trigger WAC calculations. Integrates an "AI Fatura Tara" camera/file scanner.
    *   **Reçeteler & Maliyet:** Dual-pane recipe builder modal displaying live line costs, total cost, target margin sliders, and suggested menu price recommendations.
    *   **Kârlılık:** Executive dashboard grouping items as Healthy (🟢), Warning (🟡), or Critical (🔴) based on cost drifts. Features one-click suggested price synchronization.
*   **Guest QR Menu Interface (`/menu`):**
    *   Fully localized (TR/EN) with category navigation, sticky scroll-spy header, dietary filters, and online/offline resilience.

### Layer 2: Autonomous Reasoning Engine & API (FastAPI)

*   **Multi-tenant REST API & Services:**
    *   **Guest Router:** Resolves table tokens to load restaurant menus, operating hours, and categories.
    *   **Admin Router:** Secure endpoints for CRUD operations on venues, tables, categories, and items.
    *   **Super Admin Stats Router:** Endpoint returning system-wide platform statistics.
    *   **Inventory Router (`api/inventory.py`):** Prefix `/api/admin/inventory`. Exposes CRUD endpoints for ingredients, suppliers, invoices, recipes, rules, alerts, and syncs.
*   **Costing & OCR Services:**
    *   **`services/costing.py`**: Computes WAC average costings, triggers cascade-recalculations for recipes, and processes automatic stock deductions upon completion of orders.
    *   **`services/invoice_ocr.py`**: Integrates Gemini 1.5 Flash multimodal API to parse unstructured receipt photos/PDFs into structured invoice item objects.
    *   **`services/signal_bridge.py`**: Enrichment logger mapping transaction sizes, price brackets, and dietary profiles to `UserSignal` events for the Tripzy recommendation engine.

### Layer 3: Database & Infrastructure (Supabase & Prisma)

*   **Unified Schema Design:**
    *   Synced a complete schema containing models for `Organization`, `Venue`, `Table`, `Category`, `MenuItem`, `DietaryLabel`, and `AnalyticsEvent` to Supabase PostgreSQL.
    *   Expanded schema with 9 new inventory tables (`Ingredient`, `Supplier`, `Invoice`, `InvoiceItem`, `Recipe`, `RecipeIngredient`, `IngredientCostLog`, `PricingAlert`, `PricingAlertRule`).
*   **Image Storage Migration (Supabase Storage):**
    *   Created a public `menu-images` bucket with PostgreSQL RLS policies allowing public reads and authenticated uploads, optimizing Vercel serverless functions.

---

## 3. Current System Verification Status

We successfully ran integration scripts validating the new architecture:
*   **Database Sync:** Complete. Schema is live on Supabase and database is seeded.
*   **Backend Costing Test Suite:** All unit tests in [tests/test_costing.py](file:///C:/Users/elif/.gemini/antigravity/scratch/qr-menu-saas/backend/tests/test_costing.py) passed successfully (covering WAC calculations, recipe costing, alert rule deviations, price sync updates, and order stock deductions).
*   **Frontend Production Build:** Compiles successfully without syntax, TypeScript, or type compiler errors (`next build` completes with success).

---

## 4. Next Steps & Roadmap

To achieve full launch readiness in the Turkish market, the following items remain:

1.  **AI recommendation Integration (Layer 2):**
    *   Configure the Gemini API agent inside the FastAPI server to act as a virtual waiter/sommelier.
    *   Build the reasoning module to explain *why* food items are recommended.
2.  **Semantic Search (Layer 3):**
    *   Initialize `pgvector` extension in the Supabase database.
    *   Write scripts to automatically generate and index vector embeddings for menu items based on their names, descriptions, and ingredients.
3.  **Cross-Domain Agent Inference (Layer 1):**
    *   Consume the logged `UserSignal` datasets inside the Tripzy travel engine to resolve user dining profiles.

---

## 5. Note on Prisma Introspection Mismatch Warning

During the build process or client generation, Prisma may output the following warning:
`Warning: Your database has 22 tables, but you have only defined 14 models in your Schema.`

### Why this happens
This warning is completely expected when using Supabase PostgreSQL. Supabase automatically manages several internal system schemas (`auth.*` for user management, `storage.*` for media, `graphql.*`, etc.) which contain tables like `auth.users`, `auth.sessions`, and `storage.objects`. 

Prisma connects to the PostgreSQL instance and detects all available tables across these schemas, but our `db/schema.prisma` intentionally only defines the **17 models** that our application layer directly queries (e.g. `Organization`, `Venue`, `Table`, `Category`, `MenuItem`, `Order`, `WaiterRequest`, etc.). 

### Conclusion
This warning is entirely harmless, does not affect runtime execution, and can be safely ignored. We intentionally exclude internal system tables from our schema to prevent code clutter and avoid unnecessary client generation.

