export default async function handler(req, res) {
  try {
    const base = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

    if (!base || !key) {
      return res.status(500).json({
        error: "Supabase env vars ausentes"
      });
    }

    const {
      operatorA,
      productA,
      operatorB,
      productB,
      city,
      type
    } = req.query;

    if (
      !operatorA ||
      !productA ||
      !operatorB ||
      !productB ||
      !city
    ) {
      return res.status(400).json({
        error: "Os dois planos e a cidade são obrigatórios"
      });
    }

    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`
    };

    // -----------------------------------------------------
    // Localiza o ID do produto
    // -----------------------------------------------------

    async function getProductId(operatorName, productName) {

      const operatorResponse = await fetch(
        `${base}/rest/v1/operators?select=id&name=eq.${encodeURIComponent(
          operatorName
        )}`,
        { headers }
      );

      const operators = await operatorResponse.json();

      if (!operators.length) {
        return null;
      }

      const productResponse = await fetch(
        `${base}/rest/v1/products?select=id&operator_id=eq.${
          operators[0].id
        }&product_name=eq.${encodeURIComponent(productName)}`,
        { headers }
      );

      const products = await productResponse.json();

      if (!products.length) {
        return null;
      }

      return products[0].id;
    }

    const [productIdA, productIdB] = await Promise.all([
      getProductId(operatorA, productA),
      getProductId(operatorB, productB)
    ]);

    if (!productIdA || !productIdB) {
      return res.status(404).json({
        error: "Um dos produtos não foi encontrado"
      });
    }

    // -----------------------------------------------------
    // Localiza a cidade
    // -----------------------------------------------------

    const cityResponse = await fetch(
      `${base}/rest/v1/cities?select=id,city_name,state_code&city_name=ilike.${encodeURIComponent(
        city
      )}`,
      { headers }
    );

    const cities = await cityResponse.json();

    if (!cities.length) {
      return res.status(200).json({
        summary: {
          common: 0,
          onlyA: 0,
          onlyB: 0
        },
        common: [],
        onlyA: [],
        onlyB: []
      });
    }

    const cityId = cities[0].id;

    // -----------------------------------------------------
    // Busca os prestadores de cada produto
    // -----------------------------------------------------

    async function getNetwork(productId) {

      const networkUrl = new URL(
        `${base}/rest/v1/network`
      );

      networkUrl.searchParams.set(
        "select",
        "provider_id"
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

      const networkResponse = await fetch(
        networkUrl,
        { headers }
      );

      const network = await networkResponse.json();

      if (!network.length) {
        return [];
      }

      const providerIds = network
        .map(item => item.provider_id)
        .filter(Boolean);

      const providersUrl = new URL(
        `${base}/rest/v1/providers`
      );

      providersUrl.searchParams.set(
        "select",
        "id,provider_name,provider_type,address,neighborhood,zip_code,phone"
      );

      providersUrl.searchParams.set(
        "id",
        `in.(${providerIds.join(",")})`
      );

      providersUrl.searchParams.set(
        "city_id",
        `eq.${cityId}`
      );

      providersUrl.searchParams.set(
        "active",
        "eq.true"
      );

      const providersResponse = await fetch(
        providersUrl,
        { headers }
      );

      let providers = await providersResponse.json();

      if (type) {
        providers = providers.filter(provider =>
          String(provider.provider_type || "")
            .toLowerCase()
            .includes(
              String(type).toLowerCase()
            )
        );
      }

      return providers;
    }

    const [networkA, networkB] = await Promise.all([
      getNetwork(productIdA),
      getNetwork(productIdB)
    ]);

    // -----------------------------------------------------
    // Compara os prestadores
    // -----------------------------------------------------

    const mapA = new Map(
      networkA.map(provider => [
        provider.id,
        provider
      ])
    );

    const mapB = new Map(
      networkB.map(provider => [
        provider.id,
        provider
      ])
    );

    const common = [];
    const onlyA = [];
    const onlyB = [];

    for (const [id, provider] of mapA) {

      if (mapB.has(id)) {
        common.push(provider);
      } else {
        onlyA.push(provider);
      }

    }

    for (const [id, provider] of mapB) {

      if (!mapA.has(id)) {
        onlyB.push(provider);
      }

    }

    return res.status(200).json({

      summary: {
        common: common.length,
        onlyA: onlyA.length,
        onlyB: onlyB.length
      },

      common,
      onlyA,
      onlyB

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });

  }
}
