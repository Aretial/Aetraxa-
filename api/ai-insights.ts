import { Groq } from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
let groq: Groq | null = null;

if (groqApiKey) {
  groq = new Groq({ apiKey: groqApiKey });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!groq) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
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
    1. CRITICAL: Tailor the "summary" and "suggestions" directly to their occupation and health conditions.
    2. Keep responses in the user's Preferred Language if possible.
    3. Adapt the severity based on their profile.
    4. If their Alert style is "Emergency only", be brief.
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
    2. Provide a short safety summary based on the actual environment and the User Profile.
    3. A list of 1-4 specific, highly relevant precautions or tips.
    4. "peakSunHours": A specific ESTIMATED TIME INTERVAL (e.g., "11:00 AM - 4:00 PM").
    5. "coolerHours": A specific ESTIMATED TIME INTERVAL (e.g., "6:00 AM - 9:00 AM").
    
    Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
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
    const match = responseContent.match(/\{[\s\S]*\}/);
    const cleanContent = match ? match[0] : responseContent;
    const parsed = JSON.parse(cleanContent);
    
    res.json(parsed);
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
