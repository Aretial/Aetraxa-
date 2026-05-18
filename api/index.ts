import express from "express";
import { Groq } from 'groq-sdk';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Groq API Key Pool
const keys = {
  core: process.env.GROQ_API_KEY_CORE || process.env.GROQ_API_KEY,
  aid: process.env.GROQ_API_KEY_AID || process.env.GROQ_API_KEY,
  site: process.env.GROQ_API_KEY_SITE || process.env.GROQ_API_KEY,
};

const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function getGroqClient(type: 'core' | 'aid' | 'site' = 'core') {
  const key = keys[type] || keys.core;
  if (!key) throw new Error(`GROQ_API_KEY_${type.toUpperCase()} is missing`);
  return new Groq({ apiKey: key });
}

// Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    coreConfigured: !!keys.core,
    aidConfigured: !!keys.aid,
    siteConfigured: !!keys.site 
  });
});

// AI Insights API
app.post("/api/ai-insights", async (req, res) => {
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
    2. Keep responses in the user's Preferred Language if possible.
    3. Adapt the severity based on their profile.
    `;
    }

    const uiLanguageInstruction = language === 'ur' ? '\nCRITICAL INSTRUCTION: ALL generated content MUST be in URDU language. Ensure text is in Urdu script but KEEP ALL JSON KEYS IN ENGLISH.' : '';

    const prompt = `Analyze weather data for ${weatherData.city}:
    Temp: ${weatherData.current.temp}°C, Heat Index: ${weatherData.current.heatIndex}°C, Humidity: ${weatherData.current.humidity}%, UV: ${weatherData.current.uvIndex}
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
    3. suggestions: A list of 3 high-precision tactical maneuvers.
    4. "peakSunHours": "HH:MM - HH:MM" window.
    5. "coolerHours": "HH:MM - HH:MM" window.
    
    Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
    Return ONLY valid JSON.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are the AETRAXA Tactical Safety Analyst." },
        { role: "user", content: prompt },
      ],
      model: DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    res.json(parsed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Chat Assistant
app.post("/api/ai-chat", async (req, res) => {
  try {
    const groq = getGroqClient('aid');
    const { messages, weatherData, userProfile, language } = req.body;

    const systemPrompt = `You are AETRAXA Tactical Intel Assistant.
    LIMITS: Analyze weather/heat safety ONLY. Refuse unrelated topics.
    LOCATION: ${weatherData?.city || 'Unknown'}.
    BEHAVIOR: Technical but concise. Use bullet points. 
    Language: ${language === 'ur' ? 'URDU script only.' : 'ENGLISH only.'}
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      model: DEFAULT_MODEL,
      temperature: 0.8,
      max_tokens: 1024,
    });

    res.json({ content: chatCompletion.choices[0]?.message?.content || "" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
