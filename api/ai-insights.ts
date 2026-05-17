import { Groq } from 'groq-sdk';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

  if (!groqApiKey) {
    return res.status(500).json({ 
      error: "GROQ_API_KEY not configured. Please add it to your environment variables on Vercel." 
    });
  }

  const groq = new Groq({ apiKey: groqApiKey });

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
    `;
    }

    const uiLanguageInstruction = language === 'ur' ? '\nCRITICAL INSTRUCTION: ALL generated content (qualitative assessments, summary, suggestions) MUST be in the URDU language.' : '';

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
    2. Provide a short safety summary.
    3. A list of 1-4 specific, highly relevant precautions or tips.
    4. "peakSunHours": A specific ESTIMATED TIME INTERVAL.
    5. "coolerHours": A specific ESTIMATED TIME INTERVAL.
    
    Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
    Return ONLY valid JSON.
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

    const responseContent = chatCompletion.choices[0]?.message?.content || "{}";
    
    try {
      const parsed = JSON.parse(responseContent);
      res.json(parsed);
    } catch (e) {
      res.status(500).json({ error: "Invalid response from AI" });
    }
  } catch (error: any) {
    if (error.status === 401) {
      return res.status(401).json({ 
        error: "Invalid Groq API Key. Please check your GROQ_API_KEY." 
      });
    }
    res.status(500).json({ error: error.message });
  }
}
