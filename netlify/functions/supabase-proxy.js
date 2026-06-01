const SUPABASE_URL = process.env.SUPAURL;
const SUPABASE_KEY = process.env.SUPA_SERVICE_KEY;

async function supabaseRequest(path, method = "GET", body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
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
  try { return { status: res.status, data: text ? JSON.parse(text) : null }; }
  catch(e) { return { status: res.status, data: null }; }
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  let path = event.path
    .replace("/.netlify/functions/supabase-proxy", "")
    .replace("/api/supabase", "");

  if (event.rawQuery) path = path + "?" + event.rawQuery;

  const body = event.body ? (() => { try { return JSON.parse(event.body); } catch(e) { return {}; } })() : {};

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Variables manquantes: SUPAURL ou SUPA_SERVICE_KEY" }) };
  }

  try {
    // ─── RPC (fonctions SQL) ────────────────────────────────────
    if (path.startsWith("/rpc/")) {
      const funcName = path.replace("/rpc/", "").split("?")[0];
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcName}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // ─── DATA CRUD ──────────────────────────────────────────────
    if (path.startsWith("/data/")) {
      const rawTable = path.replace("/data/", "");
      const table = rawTable.split("?")[0];
      const query = rawTable.includes("?") ? rawTable.split("?")[1] : "";
      const allowed = ["clients","stock","suppliers","purchases","sales","charges","todos","blc_users","company_info","invoice_counter","rdv"];
      if (!allowed.includes(table)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Table non autorisée: " + table }) };

      if (event.httpMethod === "GET") {
        const { data } = await supabaseRequest(`${table}${query ? "?"+query : "?select=*"}`);
        return { statusCode: 200, headers, body: JSON.stringify(data || []) };
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
        await supabaseRequest(`${table}?id=eq.${body.id}`, "DELETE");
        return { statusCode: 200, headers, body: JSON.stringify({ deleted: body.id }) };
      }
    }

    // ─── INVOICE ────────────────────────────────────────────────
    if (path.startsWith("/invoice/next")) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/next_invoice_number`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const num = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ invoiceNum: num }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: "Route inconnue: " + path }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
