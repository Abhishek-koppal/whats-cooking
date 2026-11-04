// The only place that talks to Gemini. Every feature that needs the AI goes through here,
// so the model name, timeout and error handling are changed in one spot.

// Google retires models fairly often. To switch without editing code, set GEMINI_MODEL
// in .dev.vars (on your computer) or in the Cloudflare dashboard (online).
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

// Asks Gemini for an answer in the JSON shape described by `schema`.
// Returns { ok: true, data } or { ok: false, status, error } with a user-friendly message.
export async function generateJson({ env, prompt, schema, temperature = 0.7 }) {
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY, // sent in a header, never in the URL
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    console.error("Gemini request failed:", err?.name, err?.message);
    return { ok: false, status: 504, error: "The recipe service took too long. Please try again." };
  }

  if (upstream.status === 429) {
    return { ok: false, status: 429, error: "Too many requests right now. Please wait a minute and try again." };
  }
  if (!upstream.ok) {
    // The real reason goes to the logs (visible to you); users only see a friendly message.
    console.error("Gemini error:", upstream.status, await upstream.text().catch(() => ""));
    return { ok: false, status: 502, error: "The recipe service had a problem. Please try again." };
  }

  try {
    const body = await upstream.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 502, error: "Could not read the answer. Please try again." };
  }
}
