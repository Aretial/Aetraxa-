# AETRAXA Application Roadmap

This roadmap outlines the plan for implementing new features to enhance heatwave safety and app utility.

---

## 1. AI-Powered Personal Safety Assistant (Groq Llama 4 Integration) [COMPLETED]
**Goal:** Evolution of the existing "Atmospheric Intelligence" into a context-aware, interactive survival companion.

### Implementation Details:
- **Relationship with Existing Section:** 
  - This **replaces and upgrades** the current Groq-powered "Atmospheric Intelligence" section (which used `llama-3.3-70b-versatile`). We will **completely delete** the current Groq API implementation.
  - Instead of two separate features, we are merging them into one "Tactical Intelligence Hub".
- **Functionality:** 
  - **Static Analysis (Dashboard):** High-level summary of risks and tactical recommendations (current view).
  - **Personal Assistant (Interactive):** A new "Request Intel Briefing" button will be added to the bottom of this section. Clicking it opens a side-drawer or modal chat where users can ask our Llama 4 AI personalized safety questions.
  - **Multilingual Support:** Fully bilingual (English/Urdu) analysis and interaction.
- **Positioning:**
  - **Main App Page (Dashboard):** It stays exactly where "Atmospheric Intelligence" is located (the right-side panel on desktop, below the Heat Index on mobile).
  - **UI Addition:** Only a single "Ask Survival Commander" button will be added to the existing panel to trigger the interactive assistant.
- **Development Note:** We will transition to using **three separate completely new Groq API keys** with the model `meta-llama/llama-4-scout-17b-16e-instruct` to handle processing.

---

## 2. AI Expansion Areas (Future Phases)
- **First Aid Symptom Checker:** A Groq Llama 4-powered diagnostic tool within the `Heatstroke Protocols` page for quick emergency assessment.
- **Micro-Climate Narrator:** Using Groq Llama 4 to describe the "Urban Heat Island" effect specific to the user's city.

## 2. Hyper-Local Cooling Resources (Google Maps Integration)
**Goal:** Helping users find the nearest refuge from extreme heat globally.

### Implementation Details:
- **Functionality:** 
  - Interactive map displaying "Cooling Hubs" (Public libraries, malls, shaded parks, water stations).
  - Global support including Pakistan, India, Afghanistan, and the US using Google Maps Places API.
- **Positioning:**
  - **Specialized Page:** A new `CoolingMapPage` accessible via the Navbar and buttons on the Main App Page.
  - **Main App Page:** A "Nearby Refuge" card located to the right of the Survival Metrics (Desktop) or below them (Mobile).
- **Exact Location:** Below the "Forecast Chart" on the **Main App Page**.

---

## 3. Advanced Survival Metrics ("The Truth about Heat")
**Goal:** Show high-fidelity physiological impact data that standard apps ignore.

### Implementation Details:
- **Functionality:** 
  - **Wet Bulb Temperature:** The threshold for human survival.
  - **Hydration Index:** Real-time calculation of water intake required (e.g., "Drink 1.2L per hour").
  - **UV Shield-Time:** Minutes until skin damage occurs.
  - **Internal Body Strain:** Estimated rise in core temperature based on exposure.
- **Positioning:**
  - **Main App Page:** A dedicated "Bio-Impact Grid" located immediately under the main Temperature/Heat Index display.
  - **Detail View:** Clicking any metric opens a specialized info-modal explaining the "Truth" behind that specific danger.

---

## 4. Specialized Pages (Resource Modules)
**Goal:** Detailed documentation and interactive tools for specialized heat scenarios.

### Implementation Details:
- **New Pages:**
  - `Heatstroke Protocols`: A high-contrast, easy-to-read emergency guide for heatstroke first aid.
  - `Urban Heat Tracker`: A page showing how "Urban Heat Islands" (concrete/pavement) affect the selected city compared to rural surroundings.
  - `Vulnerable Care Guide`: Specific safety checklists for the elderly, children, and pets.
- **Positioning:**
  - **Navigation:** All specialized pages will be housed under a new "Safety Hub" dropdown in the **Navbar**.
  - **Landing Page:** A "Safety Modules" section at the bottom of the landing page to educate users before they even search for a city.
  - **About Page:** Links to these resources will be added under a new "Extended Resources" section.

---

## Technical Roadmap (Next Steps)
1. **API Infrastructure:** 
   - Utilize 3 completely separate new Groq API Keys (`aetraxa-core`, `aetraxa-aid`, `aetraxa-site`) to maximize quota and ensure stability.
   - Use `meta-llama/llama-4-scout-17b-16e-instruct` model for all integrations to ensure high speed and multilingual (Urdu) support.
2. **Backend Development:** Prepare `server.ts` for Groq API proxying to keep keys secure.
3. **UI Architecture:** Update state management in `App.tsx` to handle more complex routing for Specialized Pages.
4. **Vercel Optimization:**
   - Use `api/index.ts` as the unified entry point for all Serverless Functions.
   - Configure `vercel.json` with appropriate rewrites for `/api/*` and SPA routing.
   - Maintain the multi-key pool (`GROQ_API_KEY_CORE`, `GROQ_API_KEY_AID`, `GROQ_API_KEY_SITE`) in Vercel environment variables.
5. **Integration:** Initialize Google Maps API for the Cooling Map feature.
5. **Content:** Implement the "Bio-Impact" logic to calculate Wet Bulb and Hydration needs.
