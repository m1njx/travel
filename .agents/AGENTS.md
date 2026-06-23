# Project Rules & Context: Travel Planner App (travel)

This file contains the workspace rules and architectural context to guide Antigravity and other AI coding assistants working on this codebase.

## 1. Project Context
- **Name**: travel
- **Stack**: React (v19), Vite (v6), Tailwind CSS (v4), Zustand, Firebase, `@google/generative-ai`.
- **Primary Goal**: Personal travel planning, checklist checking, expense settlement, and AI features powered by Gemini API.

## 2. API Key & Rate Limiting Rules
- **Gemini API Key**: Handled dynamically and passed as `apiKey` props to pages.
- **Strict Rate Limit Avoidance**:
  - The free-tier Gemini API has a tight limit (15 RPM).
  - **Do NOT execute Gemini API calls directly on every page mount without caching.**
  - Exchange rate caching:
    - Real-time rates from `getLiveRatesWithGemini` are cached in `localStorage` key `tripsync_exchange_rates`.
    - Cache duration: **10 minutes** (`10 * 60 * 1000` ms).
    - On mounting [ExpensePage](file:///Users/kangminje04/travel/src/pages/ExpensePage.jsx), the component checks the validity of this cache first. Do not bypass this check unless `force` is explicitly requested by user interaction (like a Refresh button).
  - AI Travel Tips:
    - Analyzed in [DashboardPage](file:///Users/kangminje04/travel/src/pages/DashboardPage.jsx) using `getAITravelTip`.
    - Must be user-triggered (via button click) to avoid automatic calls on mount.

## 3. GitHub Repositories
- Main development workspace: `/Users/kangminje04/travel`
- Local Git repository for sync/push: `/Users/kangminje04/Documents/GitHub/travel`
- Always make sure files edited in the development workspace are synchronized to the GitHub folder and pushed when major features or fixes are finalized.
