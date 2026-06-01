// Netlify Function — Gestion OAuth Shopify
// Étape 1 : /shopify-auth?shop=xxx → redirige vers Shopify pour autorisation
// Étape 2 : /shopify-auth?code=xxx&shop=xxx → échange le code contre un token

const CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SCOPES        = "read_orders,read_products,read_fulfillments,read_inventory,write_inventory";
const REDIRECT_URI  = "https://effulgent-cat-c16ac9.netlify.app/.netlify/functions/shopify-auth";

const crypto = require("crypto");

function validateHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const message = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join("&");
  const digest = crypto.createHmac("sha256", CLIENT_SECRET).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const headers = { "Content-Type": "application/json" };

  // ── Étape 2 : Shopify nous renvoie avec un code ──────────────────────────
  if (params.code && params.shop) {
    // Valider le HMAC
    if (!validateHmac(params)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "HMAC invalide" }) };
    }

    // Échanger le code contre un access token
    try {
      const res = await fetch(`https://${params.shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code:          params.code,
        }),
      });
      const data = await res.json();

      if (!data.access_token) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Token non reçu", detail: data }) };
      }

      // Afficher le token dans une page HTML simple (à copier dans les variables Netlify)
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html" },
        body: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><title>Token Shopify</title>
<style>body{font-family:Arial,sans-serif;max-width:600px;margin:60px auto;padding:20px;background:#f5f5f5}
.card{background:#fff;border-radius:12px;padding:30px;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
h2{color:#0F1535}code{display:block;background:#f0f0f5;padding:14px;border-radius:8px;font-size:13px;word-break:break-all;margin:16px 0;border-left:4px solid #F47920}
.step{background:#e8f5e9;border-radius:8px;padding:14px;margin-top:16px;font-size:13px}
</style></head>
<body><div class="card">
<h2>✅ Connexion Shopify réussie !</h2>
<p>Boutique : <strong>${params.shop}</strong></p>
<p>Copie ce token et mets-le dans <strong>Netlify → Environment variables → SHOPIFY_TOKEN</strong> :</p>
<code>${data.access_token}</code>
<div class="step">
  <strong>Étapes :</strong><br/>
  1. Copie le token ci-dessus<br/>
  2. Va sur <a href="https://app.netlify.com" target="_blank">app.netlify.com</a> → ton site → Project configuration → Environment variables<br/>
  3. Ajoute : <code>SHOPIFY_TOKEN</code> = la valeur copiée<br/>
  4. Ajoute : <code>SHOPIFY_DOMAIN</code> = <strong>${params.shop}</strong><br/>
  5. Redéploie le site<br/>
  6. Dans l'ERP clique sur ⚙ Shopify → Tester la connexion
</div>
</div></body></html>`
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── Étape 1 : Lancer le flux OAuth ──────────────────────────────────────
  const shop = params.shop || "j0syay-w1.myshopify.com";
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

  return {
    statusCode: 302,
    headers: { Location: authUrl },
    body: "",
  };
};
