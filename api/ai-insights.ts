import { Groq } from "groq-sdk";

export default async function handler(req, res) {
  // Set CORS headers just in case
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is missing");
    return res.status(500).json({ 
      error: "GROQ_API_KEY not configured. Please add it to your environment variables in Vercel." 
    });
  }

  const groq = new Groq({ apiKey });

  try {
    const { weatherData, userProfile, language } = req.body || {};

    if (!weatherData) {
      return res.status(400).json({ error: "Missing weather data" });
    }

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
      2. Keep responses in the user's Preferred Language if possible, especially the "summary" and "suggestions" arrays!
      3. Adapt the severity based on their profile.
      4. If their Alert style is "Emergency only" and conditions are not dangerous, provide very brief, minimal suggestions.
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
    4. "peakSunHours": A specific ESTIMATED TIME INTERVAL (e.g., "11:00 AM - 4:00 PM") when sun exposure is peak/dangerous.
    5. "coolerHours": A specific ESTIMATED TIME INTERVAL (e.g., "6:00 AM - 9:00 AM") when conditions are most tolerable.
    
    Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
    IMPORTANT for "suggestions": Providing highly specific and deeply actionable advice is key.
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
      res.status(200).json(parsed);
    } catch (e) {
      console.error("Failed to parse AI response:", responseContent);
      res.status(500).json({ error: "Invalid response from AI" });
    }

  } catch (error) {
    console.error("GROQ API Error:", error);
    res.status(500).json({ error: error.message || "AI failed to generate insights" });
  }
}
