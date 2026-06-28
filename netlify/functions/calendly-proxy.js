// Fonction Netlify — proxy sécurisé vers l'API Calendly v2
// Le token Calendly est stocké dans les variables d'environnement Netlify (jamais exposé au navigateur)
exports.handler = async (event) => {
  const CALENDLY_TOKEN = process.env.CALENDLY_TOKEN;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  if (!CALENDLY_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Variable d'environnement CALENDLY_TOKEN manquante" }),
    };
  }

  // L'endpoint Calendly est passé via le path, ex: /api/calendly/scheduled_events
  const path = event.path.replace("/.netlify/functions/calendly-proxy", "").replace("/api/calendly", "");
  const calendlyUrl = `https://api.calendly.com${path}${event.rawQuery ? "?" + event.rawQuery : ""}`;

  try {
    const response = await fetch(calendlyUrl, {
      method: event.httpMethod,
      headers: {
        "Authorization": `Bearer ${CALENDLY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: ["POST", "PUT", "DELETE"].includes(event.httpMethod) ? event.body : undefined,
    });
    const data = await response.json();
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
