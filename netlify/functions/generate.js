// ─── Aced — netlify/functions/generate.js ────────────────────────────────────
// Stable + optimized backend proxy for Gemini API calls
// Prevents timeouts, handles large inputs, and avoids 502 errors
// ─────────────────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { studyGuideText, promptInstructions } = JSON.parse(event.body);

    // ─── 1. Validate input ────────────────────────────────────────────────────
    if (!studyGuideText || studyGuideText.length < 50) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: "We couldn’t read this file. Try another PDF or paste text."
        })
      };
    }

    // ─── 2. Limit input size (prevents slow AI calls) ─────────────────────────
    let text = studyGuideText;
    if (text.length > 12000) {
      text = text.slice(0, 12000);
    }

    // ─── 3. Setup timeout protection ─────────────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000); // 9s max

    let response;

    try {
      response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${promptInstructions}\n\n---\nSTUDY GUIDE CONTENT:\n${text}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500, // reduced for speed
          }
        })
      });
    } catch (err) {
      clearTimeout(timeout);

      if (err.name === 'AbortError') {
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: "That file is too large or took too long. Try a smaller one."
          })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          error: "Request failed. Please try again."
        })
      };
    }

    clearTimeout(timeout);

    // ─── 4. Handle API errors cleanly ─────────────────────────────────────────
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const status = response.status;

      if (status === 429) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: "Too many requests. Wait a minute and try again."
          })
        };
      }

      if (status === 401 || status === 403) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: "Server configuration error."
          })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          error: err?.error?.message || `AI error (${status})`
        })
      };
    }

    // ─── 5. Parse response safely ─────────────────────────────────────────────
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: "AI returned an empty response. Try again."
        })
      };
    }

    // ─── 6. Success ───────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText })
    };

  } catch (err) {
    // Catch EVERYTHING → prevents 502
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: "Something went wrong. Please try again."
      })
    };
  }
};
