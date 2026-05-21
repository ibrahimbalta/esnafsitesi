import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  // Open store
  const store = getStore({ name: "easy-web-store", consistency: "strong" });

  if (req.method === "GET") {
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing key parameter" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    try {
      const data = await store.getJSON(key);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const { key: writeKey, value } = body;
    if (!writeKey) {
      return new Response(JSON.stringify({ error: "Missing key or value" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Basic verification of admin password
    const adminPassword = req.headers.get("X-Admin-Password");
    if (adminPassword !== "6032.,Elif.") {
      // Allow saving applications and reviews from the frontend without the admin password
      if (writeKey !== "applications" && writeKey !== "reviews") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    try {
      await store.setJSON(writeKey, value);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }

  return new Response("Method not allowed", { 
    status: 405,
    headers: { "Access-Control-Allow-Origin": "*" }
  });
};
