# Tripzy QR Menu SaaS - Turkey

This is a next-generation SaaS QR Code Menu system designed for restaurants, cafes, and hotels in Turkey. Built on the **Tripzy 3-Layer Architecture**, this platform features an autonomous AI agent recommendation engine that solves the restaurant customer "Cold Start" problem by using lifestyle signals, preferences, and semantic vector search.

## Project Structure

*   `db/`: PostgreSQL (Supabase) SQL migrations, schema files, and vector embedding helpers.
*   `backend/`: FastAPI backend containing the Agent Reasoning Engine (Gemini) and the database integration.
*   `frontend/`: Next.js web application for a premium, responsive, mobile-first guest interface and a simple management dashboard.

## Next Steps

1.  **Configure Database Schema:** Establish database tables in Supabase for:
    *   `organizations` (Restaurants, Hotels, Cafes)
    *   `venues` (Branches or outlets within an organization)
    *   `tables` (Physical dining tables/locations with unique QR tokens)
    *   `menu_categories` and `menu_items` (With fields for ingredients, allergens, pricing, vector embeddings)
    *   `user_signals` (Logging user interaction streams)
    *   `orders` and `order_items`
2.  **Define Agent Reasoning Engine:** Establish Pydantic models for structured output and build the FastAPI recommendation logic.
3.  **Build Next.js Frontend:** Initialize the React/Next.js client and style it with a premium Tailwind-based dark mode interface.

## Active Workspace Recommendation

If you are using Antigravity, we recommend setting this directory as your active workspace:
`C:\Users\elif\.gemini\antigravity\scratch\qr-menu-saas`
