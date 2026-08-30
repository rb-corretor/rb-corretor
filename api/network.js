export default async function handler(req, res) {
  try {
    const base = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

    if (!base || !key) {
      return res.status(500).json({
        error: "Supabase env vars ausentes"
      });
    }

    const { operator, product, city, type } = req.query;

    if (!operator || !product || !city) {
      return res.status(400).json({
        error: "Operadora, produto e cidade são obrigatórios"
      });
    }

    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`
    };

    // 1. Localiza a operadora
    const operatorResponse = await fetch(
      `${base}/rest/v1/operators?select=id,name&name=eq.${encodeURIComponent(operator)}`,
      { headers }
    );

    const operators = await operatorResponse.json();

    if (!operators.length) {
      return res.status(404).json({
        error: "Operadora não encontrada"
      });
    }

    const operatorId = operators[0].id;

    // 2. Localiza o produto da operadora
    const productResponse = await fetch(
      `${base}/rest/v1/products?select=id,product_name&operator_id=eq.${operatorId}&product_name=eq.${encodeURIComponent(product)}`,
      { headers }
    );

    const products = await productResponse.json();

    if (!products.length) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    const productId = products[0].id;

    // 3. Localiza a cidade
    const cityResponse = await fetch(
      `${base}/rest/v1/cities?select=id,city_name,state_code&city_name=ilike.${encodeURIComponent(city)}`,
      { headers }
    );

    const cities = await cityResponse.json();

    // 4. Busca a rede vinculada ao produto
    const networkUrl = new URL(`${base}/rest/v1/network`);

    networkUrl.searchParams.set(
      "select",
      "id,provider_id,product_id,status,source,last_updated"
    );

    networkUrl.searchParams.set(
      "product_id",
      `eq.${productId}`
    );

    networkUrl.searchParams.set(
      "status",
      "eq.active"
    );

    networkUrl.searchParams.set(
      "active",
      "eq.true"
    );

    const networkResponse = await fetch(networkUrl, {
      headers
    });

    const network = await networkResponse.json();

    if (!networkResponse.ok) {
      return res.status(networkResponse.status).json(network);
    }

    // 5. Busca os prestadores relacionados
    const providerIds = network
      .map((item) => item.provider_id)
      .filter(Boolean);

    if (!providerIds.length) {
      return res.status(200).json({
        count: 0,
        rows: []
      });
    }

    const providerUrl = new URL(`${base}/rest/v1/providers`);

    providerUrl.searchParams.set(
      "select",
      "id,provider_name,provider_type,address,neighborhood,zip_code,phone,email,city_id,active"
    );

    providerUrl.searchParams.set(
      "id",
      `in.(${providerIds.join(",")})`
    );

    providerUrl.searchParams.set(
      "active",
      "eq.true"
    );

    if (cities.length) {
      providerUrl.searchParams.set(
        "city_id",
        `eq.${cities[0].id}`
      );
    }

    const providerResponse = await fetch(providerUrl, {
      headers
    });

    const providers = await providerResponse.json();

    if (!providerResponse.ok) {
      return res.status(providerResponse.status).json(providers);
    }

    // 6. Filtra por tipo de atendimento, caso solicitado
    let rows = providers.map((provider) => {
      const relation = network.find(
        (item) => item.provider_id === provider.id
      );

      return {
        id: relation?.id || provider.id,
        provider_id: provider.id,
        provider_name: provider.provider_name,
        provider_type: provider.provider_type,
        address: provider.address,
        neighborhood: provider.neighborhood,
        zip_code: provider.zip_code,
        phone: provider.phone,
        email: provider.email,
        city: cities.length ? cities[0].city_name : city,
        status: relation?.status || "active",
        source: relation?.source || null,
        last_updated: relation?.last_updated || null
      };
    });

    if (type) {
      rows = rows.filter((row) =>
        String(row.provider_type || "")
          .toLowerCase()
          .includes(String(type).toLowerCase())
      );
    }

    return res.status(200).json({
      count: rows.length,
      rows
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
