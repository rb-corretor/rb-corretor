export default async function handler(req, res) {
  try {
    const base = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

    if (!base || !key) {
      return res.status(500).json({
        error: "Supabase env vars ausentes"
      });
    }

    const select =
      "id,operator_id,product_code,product_name,accommodation,coparticipation,active,operators(name)";

    const response = await fetch(
      `${base}/rest/v1/products?select=${encodeURIComponent(
        select
      )}&active=eq.true&order=product_name`,
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

    const products = JSON.parse(text).map((item) => ({
      ...item,
      operator_name: item.operators?.name || ""
    }));

    return res.status(200).json(products);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
