const VIEW_META: Record<string, { title: string; description: string }> = {
  mostConnected: {
    title: "Most Connected Entities",
    description: "The most connected entities in the US prediction market ecosystem.",
  },
  polymarket: {
    title: "Polymarket's Network",
    description: "Explore Polymarket's partnerships, regulatory connections, and infrastructure.",
  },
  kalshi: {
    title: "Kalshi's Network",
    description: "Explore Kalshi's partnerships, regulatory connections, and infrastructure.",
  },
  cryptodotcom: {
    title: "Crypto.com's Network",
    description: "Explore Crypto.com's partnerships, regulatory connections, and infrastructure.",
  },
  operational: {
    title: "Operational Infrastructure",
    description: "The operational infrastructure powering US prediction markets — DCMs, DCOs, FCMs, and IBs.",
  },
  acquisition: {
    title: "Acquisition Activity",
    description: "Acquisitions and consolidation across the US prediction market ecosystem.",
  },
  data: {
    title: "Data Partnerships",
    description: "Data and marketing partnerships across US prediction markets.",
  },
  newPartnerships: {
    title: "New Activity",
    description: "The latest partnerships and connections in the US prediction market ecosystem.",
  },
};

const DEFAULT_TITLE = "PredictionMarketPulse — US Prediction Market Partnership Tracker";
const DEFAULT_DESCRIPTION = "Track partnerships, regulatory structures, and key players across the US prediction markets ecosystem.";

export default async (request: Request) => {
  const url = new URL(request.url);

  // Only process requests to the root page with a #network hash
  // Social crawlers send the fragment via the _escaped_fragment_ param or we check referer
  // But OG scrapers strip the hash — so we use a query param fallback
  const view = url.searchParams.get("view");
  const entity = url.searchParams.get("entity");

  if (!view && !entity) {
    return;
  }

  const response = await fetch(request);
  const html = await response.text();

  let newTitle = DEFAULT_TITLE;
  let newDescription = DEFAULT_DESCRIPTION;

  if (view && VIEW_META[view]) {
    newTitle = `${VIEW_META[view].title} — PredictionMarketPulse`;
    newDescription = VIEW_META[view].description;
  } else if (entity) {
    const entityName = entity
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    newTitle = `${entityName} — PredictionMarketPulse`;
    newDescription = `Explore ${entityName}'s partnerships, regulatory connections, and role in the US prediction market ecosystem.`;
  }

  const updatedHtml = html
    .replace(
      /<meta property="og:title" content="[^"]*"\/>/,
      `<meta property="og:title" content="${newTitle}"/>`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\/>/,
      `<meta property="og:description" content="${newDescription}"/>`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\/>/,
      `<meta property="og:url" content="${url.origin}/${url.search}#network"/>`
    );

  return new Response(updatedHtml, {
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "content-type": "text/html; charset=utf-8",
    },
  });
};

export const config = {
  path: "/",
};
