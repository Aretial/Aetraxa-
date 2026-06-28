import express from "express";
import { Groq } from 'groq-sdk';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Groq API Key Pool
const keys = {
  thermal_tips: process.env.AETRAXA_THERMAL_TIPS_KEY,
  thermal_chat: process.env.AETRAXA_THERMAL_CHAT_KEY,
  aqi_tips: process.env.AETRAXA_AQI_TIPS_KEY || process.env.AETRAXA_THERMAL_TIPS_KEY,
  aqi_chat: process.env.AETRAXA_AQI_CHAT_KEY || process.env.AETRAXA_THERMAL_CHAT_KEY,
};

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function getGroqClient(tool: 'thermal' | 'aqi' = 'thermal', action: 'tips' | 'chat' = 'tips') {
  const keyName = `${tool}_${action}` as keyof typeof keys;
  const key = keys[keyName] || keys[`thermal_${action}`];
  if (!key) throw new Error(`API Key for ${tool} ${action} is missing`);
  return new Groq({ apiKey: key });
}

// Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    tipsConfigured: !!keys.thermal_tips,
    chatConfigured: !!keys.thermal_chat,
    aqiTipsConfigured: !!process.env.AETRAXA_AQI_TIPS_KEY,
    aqiChatConfigured: !!process.env.AETRAXA_AQI_CHAT_KEY
  });
});

// AI Insights API (Static Analysis)
app.post("/api/ai-insights", async (req, res) => {
  console.log("AI Insights request received for city:", req.body?.telemetryData?.city, "Tool:", req.body?.tool);
  
  try {
    const { tool, telemetryData, userProfile, language } = req.body;
    const toolType = tool === 'aqi' ? 'aqi' : 'thermal';
    const groq = getGroqClient(toolType, 'tips');
    
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

    let prompt = '';
    let systemPrompt = '';

    if (toolType === 'thermal') {
      const isDangerous = telemetryData.current.temp > 35 || telemetryData.current.heatIndex > 38 || telemetryData.current.uvIndex > 8;
      const toneInstruction = isDangerous
        ? "CRITICAL TONE: Since current weather conditions are dangerous or extreme, adopt a highly alert, authoritative, sharp, clinical, intense thermal-tactical tone emphasizing heatstroke warnings, direct cooling protocols, and urgent defensive actions."
        : "CRITICAL TONE: Since current weather is calm, comfortable, and safe, adopt a slightly calm, reassuring, peaceful, and gentle tone. Avoid intense, alarmist, or emergency-style directives; focus on cozy everyday thermal comfort, ventilation, and enjoyable hydration tips.";

      prompt = `Analyze this weather data for ${telemetryData.city}:
      Temperature: ${telemetryData.current.temp}°C
      Heat Index: ${telemetryData.current.heatIndex}°C
      Humidity: ${telemetryData.current.humidity}%
      Wind Speed: ${telemetryData.current.windSpeed} km/h
      UV Index: ${telemetryData.current.uvIndex}
      ${profileContext}
      ${uiLanguageInstruction}

      MISSION PARAMETERS:
      1. CRITICAL: ${toneInstruction}
      2. CRITICAL: Avoid generic "drink water" advice. Provide DATA-DRIVEN, TACTICAL cooling protocols.
      3. If temperature is >40°C, calculate a specific hydration target.
      4. If UV is >8, specify exactly when to avoid direct exposure based on solar peak.
      5. If humidity is >60% alongside high heat, warn about "wet-bulb" effect and sweat evaporation failure.
      
      OUTPUT REQUIREMENTS:
      1. qualitative assessments: concise (max 8 words) for temp, heatIndex, humidity, wind, uv.
      2. summary: A tactical briefing matching the requested tone (max 35 words).
      3. suggestions: A list of exactly 3 highly customized tactical suggestions matching the requested tone.
      4. "peakSunHours": "HH:MM - HH:MM" window.
      5. "coolerHours": "HH:MM - HH:MM" window.
      
      Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
      Return ONLY valid JSON.
      `;

      systemPrompt = `
      You are the AETRAXA Tactical Safety Analyst. Your ONLY purpose is to analyze weather and thermal hazard data.
      
      STRICT TOPIC ENFORCEMENT:
      - Only analyze heat, humidity, UV, and survival-related environmental factors.
      - If the user context suggests anything outside environmental safety, return a polite notification in the 'summary' that you are specialized for weather monitoring.
      `;
    } else if (toolType === 'aqi') {
      const isDangerous = telemetryData.current.aqi > 100 || telemetryData.current.pm2_5 > 50;
      const toneInstruction = isDangerous
        ? "CRITICAL TONE: Since air quality is currently hazardous or smoggy, adopt a highly alert, authoritative, sharp, clinical, intense tactical tone emphasizing direct N95 respiratory protection, avoiding outdoors, and immediate defensive actions."
        : "CRITICAL TONE: Since air quality is safe, fresh, and healthy, adopt a slightly calm, reassuring, peaceful, gentle, and conversational tone. Focus on pleasant ventilation, fresh-air comfort, and cosy breathing tips without alarmist warnings.";

      prompt = `Analyze this Air Quality data for ${telemetryData.city}:
      AQI (European): ${telemetryData.current.aqi}
      PM10: ${telemetryData.current.pm10} μg/m³
      PM2.5: ${telemetryData.current.pm2_5} μg/m³
      Carbon Monoxide: ${telemetryData.current.co} μg/m³
      Nitrogen Dioxide: ${telemetryData.current.no2} μg/m³
      Ozone: ${telemetryData.current.ozone} μg/m³
      Dust: ${telemetryData.current.dust} μg/m³
      ${profileContext}
      ${uiLanguageInstruction}

      MISSION PARAMETERS:
      1. CRITICAL: ${toneInstruction}
      2. CRITICAL: Provide DATA-DRIVEN, TACTICAL respiratory safety protocols.
      3. If PM2.5 or PM10 is high, advise on specific mask ratings (e.g., N95) or indoor filtration.
      4. Warn about prolonged outdoor activities if AQI > 100.
      
      OUTPUT REQUIREMENTS:
      1. qualitative assessments: concise (max 8 words) for aqi, pm10, pm2_5, ozone.
      2. summary: A tactical briefing matching the requested tone (max 35 words).
      3. suggestions: A list of exactly 3 highly customized suggestions matching the requested tone.
      
      Format: JSON with keys "aqi", "pm10", "pm2_5", "ozone", "summary", "suggestions" (array of strings).
      Return ONLY valid JSON.
      `;

      systemPrompt = `
      You are the AETRAXA Tactical Safety Analyst. Your ONLY purpose is to analyze air quality and respiratory hazard data.
      
      STRICT TOPIC ENFORCEMENT:
      - Only analyze PM concentration, AQI, toxic gases, and respiratory survival environmental factors.
      - If the user context suggests anything outside environmental safety, return a polite notification in the 'summary' that you are specialized for environmental monitoring.
      `;
    }

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
    const { tool, messages, weatherData, aqiData, userProfile, language } = req.body;
    const toolType = tool === 'aqi' ? 'aqi' : 'thermal';
    const groq = getGroqClient(toolType, 'chat');

    let systemPrompt = '';

    if (toolType === 'aqi') {
      const currentAqi = aqiData?.current?.aqi || 0;
      const pm2_5 = aqiData?.current?.pm2_5 || 0;
      const pm10 = aqiData?.current?.pm10 || 0;
      const ozone = aqiData?.current?.ozone || 0;
      const co = aqiData?.current?.co || 0;
      const no2 = aqiData?.current?.no2 || 0;
      const dust = aqiData?.current?.dust || 0;

      systemPrompt = `You are the AETRAXA Tactical Air Quality Assistant. 
      
      SUPPORTED LANGUAGES & TRANSLITERATIONS (CRITICAL):
      1. Accepting Input: The user can ask questions in ANY language, dialect, or script (English, Urdu, Sindhi, Punjabi, Pashto, Balochi, Hindi, Arabic, etc.).
      2. Transliteration (Romanized Regional Languages): Users may write messages in Romanized scripts (phonetic English spelling). Examples:
         - "hawa kharab hai kya krun" / "dhund lg rahi hai" / "smog check kro" / "saans nahi aa raha" / "khansi ho rahi hai" (Roman Urdu/Hindi/Punjabi meaning "air is bad, what to do", "experiencing smog", "smog check", "cannot breathe", "coughing")
         - "mask" / "safey" (meaning masks/protection)
         - "hawa" / "dust" (meaning wind/air quality/dirt)
         These are 100% ON-TOPIC. Any message mentioning environmental air quality, smog, coughing, asthmatic struggles, smoke, chemical odor, dust, masks, N95 respirators, throat irritation, ventilation, or atmospheric haze is completely inside your mission scope.
      3. Reply Language: 
         - Match the user's language and script. If they write in Roman Urdu (e.g. "khansi ho rahi hai"), reply in simple, readable Roman Urdu or native Urdu. If the global language is "ur" or they write in Urdu script, write in Urdu script. If English, write in English.
      
      STRICT OPERATIONAL LIMITS:
      - MISSION: Analyze air quality, smog, dust storms, chemical gas sat, and respiratory survival ONLY.
      - ON-TOPIC CONTENT: Any mention of air safety, AQI readings, particulates, smog, smoke, lung irritation, breathing discomfort, inhalers, N95 masks, air purifiers, or ventilation in any language (native or Roman script) is fully ON-TOPIC and MUST be answered.
      - RESTRICTION: Do NOT answer questions unrelated to air quality or respirator survival.
      - REFUSAL PROTOCOL: Only refuse if the topic is completely unrelated. Politely refuse with: "Operational failure. My tactical core is only calibrated for air quality and respiratory hazard intelligence. Please stay on topic for a relevant briefing." 
      
      CURRENT OPERATIONAL THEATER:
      - City: ${aqiData?.city || weatherData?.city || 'Unknown'}
      - AQI Index: ${currentAqi} (European Index)
      - Pollutant Breakdown:
        * PM2.5 (Fine dust): ${pm2_5} µg/m³ [Safe Limit: 15]
        * PM10 (Coarse dust): ${pm10} µg/m³ [Safe Limit: 45]
        * Ground ozone (O₃): ${ozone} µg/m³ [Safe Limit: 100]
        * Carbon Monoxide (CO): ${co} µg/m³ [Safe Limit: 4000]
        * Nitrogen Dioxide (NO₂): ${no2} µg/m³ [Safe Limit: 25]
        * Silt/Soil Dust: ${dust} µg/m³ [Safe Limit: 50]
      - Current Weather Conditions (Integration Context):
        * Temperature: ${weatherData?.current?.temp != null ? `${weatherData.current.temp}°C` : 'N/A'}
        * Heat Index: ${weatherData?.current?.heatIndex != null ? `${weatherData.current.heatIndex}°C` : 'N/A'}
        * Humidity: ${weatherData?.current?.humidity != null ? `${weatherData.current.humidity}%` : 'N/A'}
        * UV Index: ${weatherData?.current?.uvIndex != null ? `${weatherData.current.uvIndex}` : 'N/A'}
      
      USER PROFILE:
      - Occupation: ${userProfile?.occupation || 'N/A'}
      - Vulnerability: ${(userProfile?.health_conditions || []).join(', ') || 'Standard'}
      
      DYNAMIC AIR-BASED TONE (CRITICAL):
      - Scale intensity to AQI values before replying:
        1. IF THE AIR IS DANGEROUS / SMOGGY (e.g. Current AQI >= 100 or PM2.5 >= 55): Use a highly alert, authoritative, sharp, clinical, and intense tactical tone emphasizing respirator masks (N95), cessation of outdoor exertion, active chemical air scrubbing, and direct protection moves.
        2. IF THE AIR IS SAFE / HEALTHY (e.g. AQI < 100 and PM2.5 < 15): DO NOT use intense or emergency tactical alarms. Use a very calm, gentle, reassuring, relaxed, and conversational tone. Focus on pleasant ventilation, fresh-air comfort, and peaceful breathing tips. Keep the conversation cosy and pleasant.
      
      BEHAVIOR:
      1. Technical but extremely concise. Avoid long-winded explanations.
      2. Prioritize life-safety and lung defense advice, matching intensity to actual local air hazard stress level.
      3. Match the user's input language and style.
      4. Be authoritative under high smog, but highly calm and gentle under fresh, healthy conditions. Use bullet points for checklists.
      5. PARAGRAPHING: Use double line breaks between paragraphs.
      6. LENGTH: Keep responses short and to the point.
      `;
    } else {
      systemPrompt = `You are the AETRAXA Tactical Intel Assistant. 
      
      SUPPORTED LANGUAGES & TRANSLITERATIONS (CRITICAL):
      1. Accepting Input: The user can ask questions in ANY language, dialect, or script. Examples: English, Urdu, Sindhi, Punjabi, Pashto, Balochi, Hindi, Arabic, Bengali, etc.
      2. Transliteration (Romanized Regional Languages): Users may write messages in Romanized scripts (phonetic English spelling of regional languages). Examples:
         - "garmi lg rahi hai" / "garmi lag rahi hai kya krun" / "bohot garmi hai" (Roman Urdu/Hindi/Punjabi meaning "feeling hot, what to do")
         - "paani" / "water" (meaning water/hydration)
         - "hawa" / "ventilator" (meaning air/wind/ventilation)
         - "garam" (meaning hot)
         - "baraf" / "clima" (meaning ice/cooling options)
         These are 100% ON-TOPIC. Any message mentioning, asking about, or complaining about environmental discomfort (heat, sweat, sun, hot winds, thirst, exhaustion, temperature, weather, cooling options like fans/ACs, or hydration) is completely inside your mission scope.
      3. Reply Language: 
         - Match the user's language and script. If they write in Roman Urdu (e.g. "garmi lag rahi hai"), reply in simple, readable Roman Urdu or native Urdu. If the global language is "ur" or they write in Urdu script, write in Urdu script. If English, write in English.
      
      STRICT OPERATIONAL LIMITS:
      - MISSION: Analyze weather, heat safety, and environmental survival ONLY.
      - ON-TOPIC CONTENT: Any mention of feeling hot/cold, sun exposure, dehydration, thirst, seeking shade, heatstroke, air conditioning, ice, fans, water, local temperatures, weather, humidity, or high UV indices, expressed in any language or written style (such as native script or Roman script), is fully ON-TOPIC and MUST be answered.
      - RESTRICTION: You MUST NOT answer questions unrelated to weather, thermal hazards, hydration, or cooling (such as coding, math, general science, fictional storytelling, or general life/career advice).
      - REFUSAL PROTOCOL: Only refuse if the topic is completely unrelated (e.g. "write a python function", "who is Einstein", "tell me a recipe for pizza"). In that specific case, politely refuse with: "Operational failure. My tactical core is only calibrated for weather and thermal hazard intelligence. Please stay on topic for a relevant briefing." 
      
      CURRENT OPERATIONAL THEATER:
      - City: ${weatherData?.city || aqiData?.city || 'Unknown'}
      - Heat Index: ${weatherData?.current?.heatIndex || 'Unknown'}°C
      - Status: ${weatherData?.current?.temp || 'Unknown'}°C, ${weatherData?.current?.humidity || 'Unknown'}% Humidity, UV ${weatherData?.current?.uvIndex || 'Unknown'}
      - Current Air Quality Conditions (Integration Context):
        * AQI Index: ${aqiData?.current?.aqi != null ? `${aqiData.current.aqi} (European Index)` : 'N/A'}
        * PM2.5 (Fine dust): ${aqiData?.current?.pm2_5 != null ? `${aqiData.current.pm2_5} µg/m³` : 'N/A'} [Safe Limit: 15]
        * PM10 (Coarse dust): ${aqiData?.current?.pm10 != null ? `${aqiData.current.pm10} µg/m³` : 'N/A'} [Safe Limit: 45]
      
      USER PROFILE:
      - Occupation: ${userProfile?.occupation || 'N/A'}
      - Vulnerability: ${(userProfile?.health_conditions || []).join(', ') || 'Standard'}
      
      DYNAMIC WEATHER-BASED TONE (CRITICAL):
      - Analyze the current environmental values (Temperature, Heat Index, and UV index) before replying:
        1. IF THE WEATHER IS EXTREME or DANGEROUS (e.g. Heat Index >= 35°C, Temperature >= 38°C, or UV index >= 8): Use an highly alert, authoritative, sharp, and intense tactical tone emphasizing high-level safety instructions, medical/heatstroke warnings, hydration alerts, and direct action.
        2. IF THE WEATHER IS COMFORTABLE or SAFE (e.g. Temperature < 35°C and Heat Index < 33°C, with low UV): DO NOT use alarmist, doom-laden, or intense tactical jargon. Instead, use a very calm, friendly, reassuring, relaxed, and conversational tone. Give simple, peaceful everyday comfort tips (e.g. drinking water, simple ventilation, pleasant walks) rather than emergency survival directives. Keep the conversation cozy and pleasant.
      
      BEHAVIOR:
      1. Technical but extremely concise. Avoid long-winded explanations.
      2. Prioritize life-safety and tactical cooling advice, matching intensity to actual local weather stress level.
      3. Language: Match the user's input language and style (if they speak Roman Urdu, reply in Roman Urdu or Urdu; if they speak Punjab/Sindhi/English, match gracefully).
      4. Be authoritative under extreme heat, but highly calm, reassuring, and gentle under mild/pleasant conditions. Use bullet points for checklists. 
      5. PARAGRAPHING: Use double line breaks between paragraphs for clarity. 
      6. LENGTH: Keep responses short and to the point.
      `;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      model: DEFAULT_MODEL,
      temperature: 0.8,
      max_tokens: 1024,
      stream: false,
    });

    res.json({ 
      content: chatCompletion.choices[0]?.message?.content || "" 
    });
  } catch (error: any) {
    console.error("Chat API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
