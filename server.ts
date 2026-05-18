import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Groq } from 'groq-sdk';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Groq API Key Pool
const keys = {
  core: process.env.GROQ_API_KEY_CORE,
  aid: process.env.GROQ_API_KEY_AID,
  site: process.env.GROQ_API_KEY_SITE,
};

const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function getGroqClient(type: 'core' | 'aid' | 'site' = 'core') {
  const key = keys[type] || keys.core;
  if (!key) throw new Error(`GROQ_API_KEY_${type.toUpperCase()} is missing`);
  return new Groq({ apiKey: key });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      coreConfigured: !!keys.core,
      aidConfigured: !!keys.aid,
      siteConfigured: !!keys.site 
    });
  });

  // AI Insights API (Static Analysis)
  app.post("/api/ai-insights", async (req, res) => {
    console.log("AI Insights request received for city:", req.body?.weatherData?.city);
    
    try {
      const groq = getGroqClient('core');
      const { weatherData, userProfile, language } = req.body;
      
      let profileContext = '';
      if (userProfile) {
        profileContext = `
      User Profile Context:
      - Occupation: ${userProfile.occupation || 'N/A'}
      - Time outside: ${userProfile.outdoor_hours || 0} hours/day
      - Health conditions: ${(userProfile.health_conditions || []).join(', ') || 'None'}
      - Monitoring others: ${(userProfile.monitoring_others || []).join(', ') || 'None'}
      - Alert style preference: ${userProfile.alert_style || 'Detailed'}
      - Preferred language: ${userProfile.preferred_language || (language === 'ur' ? 'Urdu' : 'English')}
      
      IMPORTANT PERSONALIZATION INSTRUCTIONS:
      1. CRITICAL: Tailor the "summary" and "suggestions" directly to their occupation and health conditions.
      2. Keep responses in the user's Preferred Language if possible, especially the "summary" and "suggestions" arrays! (e.g. if Urdu, output Urdu strings for summary and suggestions, but keep JSON keys in English).
      3. Adapt the severity based on their profile.
      `;
      }

      const uiLanguageInstruction = language === 'ur' ? '\nCRITICAL INSTRUCTION: ALL generated content (qualitative assessments, summary, suggestions) MUST be in the URDU language. Ensure you are outputting the text in the Urdu language, but KEEP ALL JSON KEYS IN ENGLISH.' : '';

      const prompt = `Analyze this weather data for ${weatherData.city}:
      Temperature: ${weatherData.current.temp}°C
      Heat Index: ${weatherData.current.heatIndex}°C
      Humidity: ${weatherData.current.humidity}%
      Wind Speed: ${weatherData.current.windSpeed} km/h
      UV Index: ${weatherData.current.uvIndex}
      ${profileContext}
      ${uiLanguageInstruction}

      MISSION PARAMETERS:
      1. CRITICAL: Avoid generic "drink water" advice. Provide DATA-DRIVEN, TACTICAL cooling protocols.
      2. If temperature is >40°C, calculate a specific hydration target (e.g. "Drink 0.5L every 45 mins").
      3. If UV is >8, specify exactly when to avoid direct exposure based on solar peak.
      4. If humidity is >60% alongside high heat, warn about "wet-bulb" effect and sweat evaporation failure.
      
      OUTPUT REQUIREMENTS:
      1. qualitative assessments: concise (max 8 words) for temp, heatIndex, humidity, wind, uv.
      2. summary: A high-alert, tactical briefing (max 30 words).
      3. suggestions: A list of 3 high-precision tactical maneuvers (e.g., "Maneuver: Pre-chill core temp before 1100h", "Hydration: 4L target with electrolyte replenishment").
      4. "peakSunHours": "HH:MM - HH:MM" window.
      5. "coolerHours": "HH:MM - HH:MM" window.
      
      Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
      Return ONLY valid JSON.
      `;

      const systemPrompt = `
      You are the AETRAXA Tactical Safety Analyst. Your ONLY purpose is to analyze weather and thermal hazard data.
      
      STRICT TOPIC ENFORCEMENT:
      - Only analyze heat, humidity, UV, and survival-related environmental factors.
      - If the user context suggests anything outside environmental safety, return a polite notification in the 'summary' that you are specialized for weather monitoring.
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: DEFAULT_MODEL,
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const responseContent = chatCompletion.choices[0]?.message?.content || "";
      
      try {
        const match = responseContent.match(/\{[\s\S]*\}/);
        const cleanContent = match ? match[0] : responseContent;
        const parsed = JSON.parse(cleanContent);
        res.json(parsed);
      } catch (e) {
        console.error("Failed to parse AI response:", responseContent);
        res.status(500).json({ error: "Invalid response from AI" });
      }
    } catch (error: any) {
      console.error("Groq API Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chat Assistant (Tactical Briefing)
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const groq = getGroqClient('aid');
      const { messages, weatherData, userProfile, language } = req.body;

      const systemPrompt = `You are the AETRAXA Tactical Intel Assistant. 
      
      STRICT OPERATIONAL LIMITS:
      - MISSION: Analyze weather, heat safety, and environmental survival ONLY.
      - RESTRICTION: You MUST NOT answer questions unrelated to weather, thermal hazards, hydration, or cooling.
      - REFUSAL PROTOCOL: If the user asks about ANYTHING ELSE (e.g., coding, general knowledge, life advice), you MUST politely refuse and state: "Operational failure. My tactical core is only calibrated for weather and thermal hazard intelligence. Please stay on topic for a relevant briefing."
      
      CURRENT OPERATIONAL THEATER:
      - City: ${weatherData?.city || 'Unknown'}
      - Heat Index: ${weatherData?.current?.heatIndex || 'Unknown'}°C
      - Status: ${weatherData?.current?.temp || 'Unknown'}°C, ${weatherData?.current?.humidity || 'Unknown'}% Humidity, UV ${weatherData?.current?.uvIndex || 'Unknown'}
      
      USER PROFILE:
      - Occupation: ${userProfile?.occupation || 'N/A'}
      - Vulnerability: ${(userProfile?.health_conditions || []).join(', ') || 'Standard'}
      
      BEHAVIOR:
      1. Technical but extremely concise. Avoid long-winded explanations.
      2. Prioritize life-safety and tactical cooling advice.
      3. Language: ${language === 'ur' ? 'Reply in URDU only.' : 'Reply in ENGLISH only.'}
      4. Be authoritative. Use bullet points for checklists. 
      5. PARAGRAPHING: Use double line breaks between paragraphs for clarity. 
      6. LENGTH: Keep responses short and to the point.
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        model: DEFAULT_MODEL,
        temperature: 0.8,
        max_tokens: 1024,
        stream: false, // Keeping it simple for first step
      });

      res.json({ 
        content: chatCompletion.choices[0]?.message?.content || "" 
      });
    } catch (error: any) {
      console.error("Chat API Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
