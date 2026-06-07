# Tripzy QR Menu SaaS - Turkey

This is a next-generation SaaS QR Code Menu system designed for restaurants, cafes, and hotels in Turkey. Built on the **Tripzy 3-Layer Architecture**, this platform features an autonomous AI agent recommendation engine that solves the restaurant customer "Cold Start" problem by using lifestyle signals, preferences, and semantic vector search.

## Project Structure

*   `db/`: PostgreSQL (Supabase) SQL migrations, schema files, and vector embedding helpers.
*   `backend/`: FastAPI backend containing the Agent Reasoning Engine (Gemini) and the database integration.
*   `frontend/`: Next.js web application for a premium, responsive, mobile-first guest interface and a simple management dashboard.

## Core Modules & Features

1. **Multi-Tenant QR Menu Management**: CRUD for organizations, venues, category/item lists (with translation support), calorie calculators, and allergen filters.
2. **AI-Enabled Recommendation & Vector Search**: Captures explicit and implicit user signals to resolve the cold-start problem. Supports semantic search.
3. **Inventory Costing & Recipe Engine (Gated by Organization Flag)**:
    - **WAC calculations**: Automatically computes Weighted Average Cost on supplier invoice receipts.
    - **Recipe builder**: LIVE portion-based food cost calculation with target margin slide controllers and price recommendations.
    - **Yapay Zeka (AI) OCR Scan**: Automatically extracts invoice line-items from uploaded bills using Gemini 1.5 Flash.
    - **One-click Price Sync**: Seamlessly syncs suggested costs and margins directly into the guest menu.
    - **Stock Deduction**: Deducts ingredient stocks automatically upon guest checkout, alerting on reorder levels.
4. **Tripzy Signal Bridge**: Intercepts order completion events to map transaction histories and dietary preferences to Tripzy lifestyle vector signals.

## Running Locally

### Backend (FastAPI)
```bash
cd backend
.venv\Scripts\python.exe -m uvicorn main:app --reload
```

### Frontend (Next.js)
```bash
cd frontend
npm run dev
```

## Active Workspace Recommendation

If you are using Antigravity, we recommend setting this directory as your active workspace:
`C:\Users\elif\.gemini\antigravity\scratch\qr-menu-saas`
