import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Groq } from 'groq-sdk';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check for API Key
const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

let groq: Groq | null = null;
if (groqApiKey) {
  console.log("Initializing server-side Groq with key starting with:", groqApiKey.substring(0, 5) + "...");
  groq = new Groq({ apiKey: groqApiKey });
} else {
  console.warn("GROQ_API_KEY is not defined in the environment.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", groqConfigured: !!groq });
  });

  // AI Insights API
  app.post("/api/ai-insights", async (req, res) => {
    console.log("AI Insights request received for city:", req.body?.weatherData?.city);
    if (!groq) {
      console.error("GROQ_API_KEY is missing");
      return res.status(500).json({ 
        error: "GROQ_API_KEY not configured. Please add it to your environment variables." 
      });
    }

    try {
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
      1. CRITICAL: Tailor the "summary" and "suggestions" directly to their occupation and health conditions. (e.g. if they are a Construction Worker, suggest specific work/rest cycles. If they have a Heart condition, emphasize cardiovascular strain early).
      2. Keep responses in the user's Preferred Language if possible, especially the "summary" and "suggestions" arrays! (e.g. if Urdu, output Urdu strings for summary and suggestions, but keep JSON keys in English).
      3. Adapt the severity based on their profile: Someone active or with health conditions may face higher danger at lower thresholds.
      4. If their Alert style is "Emergency only" and conditions are not dangerous, provide very brief, minimal suggestions. If conditions are extremely dangerous, be very firm.
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

      Instructions:
      1. Provide a concise qualitative assessment (max 10 words) for: temp, heatIndex, humidity, wind, uv.
      2. Provide a short safety summary based on the actual environment and the User Profile (e.g., if it's cold/normal, do not focus on heat exhaustion).
      3. A list of 1-4 specific, highly relevant precautions or tips. If conditions are optimal/nominal, fewer or no precautions are necessary—do not invent hazards. Make SURE to address their specific occupation or health condition in these tips if it increases their risk.
      4. "peakSunHours": A specific ESTIMATED TIME INTERVAL (e.g., "11:00 AM - 4:00 PM") when sun exposure is peak/dangerous.
      5. "coolerHours": A specific ESTIMATED TIME INTERVAL (e.g., "6:00 AM - 9:00 AM") when conditions are most tolerable.
      
      Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
      IMPORTANT for "suggestions": Providing highly specific and deeply actionable advice is key. Incorporate the "peakSunHours" and "coolerHours". Target specific demographic based on their profile. Avoid generic tips.
      - Use normal sentence case (no all-caps).
      - Return ONLY valid JSON.
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that outputs only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500,
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
      console.error("Groq API Error:", error);
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
