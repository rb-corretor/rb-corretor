export default async function handler(req, res) {
  try {
    const base = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

    if (!base || !key) {
      return res.status(500).json({
        error: "Supabase env vars ausentes"
      });
    }

    const response = await fetch(
      `${base}/rest/v1/operators?select=id,name,short_name,active&active=eq.true&order=name`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    return res.status(200).json(JSON.parse(text));

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
