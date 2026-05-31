// Fonction Netlify — proxy sécurisé vers l'API Shopify Admin
// Le token Shopify est stocké dans les variables d'environnement Netlify (jamais exposé au navigateur)

exports.handler = async (event) => {
  const SHOPIFY_DOMAIN  = process.env.SHOPIFY_DOMAIN;   // ex: blc-import.myshopify.com
  const SHOPIFY_TOKEN   = process.env.SHOPIFY_TOKEN;    // ex: shpat_xxxxxxxxxxxxx

  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Variables d'environnement Shopify manquantes" }),
    };
  }

  // L'endpoint Shopify est passé via le path, ex: /api/shopify/orders.json
  const path = event.path.replace("/.netlify/functions/shopify-proxy", "").replace("/api/shopify", "");
  const shopifyUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-04${path}${event.rawQuery ? "?" + event.rawQuery : ""}`;

  try {
    const response = await fetch(shopifyUrl, {
      method: event.httpMethod,
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
      body: ["POST", "PUT", "DELETE"].includes(event.httpMethod) ? event.body : undefined,
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
