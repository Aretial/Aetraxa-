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
        const hasVulnerabilities = (userProfile.health_conditions || []).some((c: string) => c !== 'None');
        const hasDependents = (userProfile.monitoring_others || []).some((d: string) => d !== 'None');
        const hasOccupation = !!userProfile.occupation && userProfile.occupation.trim().toLowerCase() !== 'none' && userProfile.occupation.trim() !== '';

        profileContext = `
      User Profile Context:
      - Occupation: ${userProfile.occupation || 'Not declared'}
      - Time outside: ${userProfile.outdoor_hours || 0} hours/day
      - Health conditions: ${(userProfile.health_conditions || []).join(', ') || 'None'}
      - Monitoring others: ${(userProfile.monitoring_others || []).join(', ') || 'None'}
      - Alert style preference: ${userProfile.alert_style || 'Detailed'}
      - Preferred language: ${userProfile.preferred_language || (language === 'ur' ? 'Urdu' : 'English')}
      
      IMPORTANT PERSONALIZATION INSTRUCTIONS (CRITICAL HIGHEST PRIORITY):
      1. You MUST explicitly and custom-tailor the "summary" and ALL 3 items of "suggestions" directly to the user's declared profile.
      ${hasOccupation ? `- Since their occupation is "${userProfile.occupation}", at least one suggestion and the summary MUST directly address physical workload, outdoor exposure patterns, and safety maneuvers specific to a ${userProfile.occupation}.` : ''}
      ${hasVulnerabilities ? `- Since they have health conditions: "${(userProfile.health_conditions || []).filter((h: string) => h !== 'None').join(', ')}", at least one suggestion MUST explicitly detail the physiological risks (e.g., cardiovascular strain, airway constriction) and actionable preventions for these exact conditions under the current heat/humidity.` : ''}
      ${hasDependents ? `- Since they monitor dependents: "${(userProfile.monitoring_others || []).filter((h: string) => h !== 'None').join(', ')}", at least one suggestion MUST provide concrete tactical instructions to safeguard these dependents (e.g., seniors, children, pets) in these current environments.` : ''}
      - Each of the 3 suggestions MUST be prefixed by its profile-relevant label, for example:
        "Occupation [${userProfile.occupation || 'N/A'}]: <highly tailored protocol>"
        "Medical [${(userProfile.health_conditions || []).filter((h: string) => h !== 'None')[0] || 'N/A'}]: <highly tailored physiological protocol>"
        "Dependent [${(userProfile.monitoring_others || []).filter((h: string) => h !== 'None')[0] || 'N/A'}]: <highly tailored dependent protection protocol>"
      - If they have no custom configurations (occupation is empty, medical is 'None', dependents is 'None'), construct tactical recommendations based on their "${userProfile.outdoor_hours || 0} hours" of daily outdoor exposure, and add a friendly note in the "summary" encouraging them to click the gear icon to customize their tactical settings.
      2. Keep responses in the user's Preferred Language if possible, especially the "summary" and "suggestions" arrays! (e.g. if Urdu, output Urdu strings for summary and suggestions, but keep JSON keys in English).
      3. Scale severity and urgency of warnings based on their profile data (e.g. cardiovascular risk should trigger much faster, high-priority cardiac strain alerts).
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
      2. If temperature is >40°C, calculate a specific hydration target.
      3. If UV is >8, specify exactly when to avoid direct exposure based on solar peak.
      4. If humidity is >60% alongside high heat, warn about "wet-bulb" effect and sweat evaporation failure.
      
      OUTPUT REQUIREMENTS:
      1. qualitative assessments: concise (max 8 words) for temp, heatIndex, humidity, wind, uv.
      2. summary: A high-alert, tactical briefing (max 35 words).
      3. suggestions: A list of exactly 3 high-precision, hyper-personalized tactical maneuvers (do NOT use generic suggestions).
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
