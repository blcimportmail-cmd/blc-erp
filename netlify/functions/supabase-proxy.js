// Fonction Netlify — proxy sécurisé vers Supabase
// Gère auth, CRUD et todolist

const SUPABASE_URL   = process.env.SUPAURL;
const SUPABASE_KEY   = process.env.SUPA_SERVICE_KEY; // service_role key (jamais exposée)

async function supabaseRequest(path, method = "GET", body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

// Simple password hash check (bcrypt via crypto)
const crypto = require("crypto");
function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "BLC_SALT_2024").digest("hex");
}

exports.handler = async (event) => {
  const path = event.path.replace("/.netlify/functions/supabase-proxy", "");
  const body = event.body ? JSON.parse(event.body) : {};

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    // ─── AUTH ────────────────────────────────────────────────
    if (path === "/auth/login") {
      const { username, password } = body;
      const hash = hashPassword(password);
      const { data } = await supabaseRequest(
        `blc_users?username=eq.${username.toLowerCase()}&password_hash=eq.${hash}&select=id,username,display_name,role,avatar_color`
      );
      if (!data || data.length === 0) return { statusCode: 401, headers, body: JSON.stringify({ error: "Identifiants incorrects" }) };
      return { statusCode: 200, headers, body: JSON.stringify({ user: data[0] }) };
    }

    // ─── GENERIC CRUD ────────────────────────────────────────
    // GET /data/clients, /data/stock, /data/sales, etc.
    if (path.startsWith("/data/")) {
      const table = path.replace("/data/", "").split("?")[0];
      const query = path.includes("?") ? path.split("?")[1] : "";
      const allowedTables = ["clients","stock","suppliers","purchases","sales","charges","todos","blc_users","company_info","invoice_counter"];
      if (!allowedTables.includes(table)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Table non autorisée" }) };

      if (event.httpMethod === "GET") {
        const { data } = await supabaseRequest(`${table}${query ? "?"+query : "?select=*"}`);
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
      if (event.httpMethod === "POST") {
        const { data } = await supabaseRequest(table, "POST", body);
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
      if (event.httpMethod === "PATCH") {
        const { id, ...updates } = body;
        const { data } = await supabaseRequest(`${table}?id=eq.${id}`, "PATCH", updates);
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
      if (event.httpMethod === "DELETE") {
        const { id } = body;
        await supabaseRequest(`${table}?id=eq.${id}`, "DELETE");
        return { statusCode: 200, headers, body: JSON.stringify({ deleted: id }) };
      }
    }

    // ─── NEXT INVOICE NUMBER ─────────────────────────────────
    if (path === "/invoice/next") {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/next_invoice_number`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const num = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ invoiceNum: num }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: "Route inconnue" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
