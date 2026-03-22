// ─── Aced — netlify/functions/generate.js ────────────────────────────────────
// Secure backend proxy for Gemini API calls
// API key lives here as an environment variable, never exposed to the client
// ─────────────────────────────────────────────────────────────────────────────


exports.handler = async function(event) {
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { studyGuideText, promptInstructions } = JSON.parse(event.body);

    if (!studyGuideText) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No study guide text provided' }) };
    }

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${promptInstructions}\n\n---\nSTUDY GUIDE CONTENT:\n${studyGuideText}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const status = response.status;

      if (status === 429) return { statusCode: 429, body: JSON.stringify({ error: 'Rate limit hit. Wait a minute and try again.' }) };
      if (status === 403 || status === 401) return { statusCode: 401, body: JSON.stringify({ error: 'API key error.' }) };

      return { statusCode: status, body: JSON.stringify({ error: err?.error?.message || `API error (${status})` }) };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Gemini returned empty response.' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Server error' }) };
  }
};