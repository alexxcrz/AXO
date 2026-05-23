const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;
const NEWS_STALE_MAX_MS = 6 * 60 * 60 * 1000;
const GOOGLE_NEWS_RSS_BASE = "https://news.google.com/rss/search";
const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc";
const FETCH_TIMEOUT_MS = 20_000;
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TOPIC_QUERIES = {
  general: "(carretera OR autopista OR vialidad OR tráfico OR trafico)",
  accidentes: "(accidente OR choque OR volcadura OR carambola OR atropellado)",
  bloqueos: "(bloqueo OR cierre vial OR cierre de carretera OR manifestación OR manifestacion)",
  clima: "(lluvia OR inundación OR inundacion OR deslave OR clima en carretera)",
  seguridad: "(asalto en carretera OR inseguridad en carretera OR robo en carretera)",
  obras: "(obras viales OR mantenimiento carretera OR reparación autopista OR reparacion autopista)",
};

const REGION_ALIASES = {
  méxico: "Mexico",
  mexico: "Mexico",
  nacional: "Mexico",
  "estado de méxico": "Estado de Mexico",
  "estado de mexico": "Estado de Mexico",
  "baja california": "Baja California Mexico",
  yucatán: "Yucatan Mexico",
  yucatan: "Yucatan Mexico",
  michoacán: "Michoacan Mexico",
  michoacan: "Michoacan Mexico",
};

const cache = new Map();

function normalizeTopic(value) {
  const topic = String(value || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TOPIC_QUERIES, topic) ? topic : "general";
}

function normalizeRegion(value) {
  const raw = String(value || "Mexico").trim();
  if (!raw) return "Mexico";
  const alias = REGION_ALIASES[raw.toLowerCase()];
  return alias || raw;
}

function normalizeLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 20;
  return Math.max(5, Math.min(50, Math.round(numeric)));
}

function normalizeHours(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 24;
  return Math.max(1, Math.min(24 * 14, Math.round(numeric)));
}

function sanitizeKeyword(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}\s.,:_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

function stripHtml(value) {
  return decodeXmlEntities(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractTagValue(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function buildNewsQuery({ topic, region, keyword }) {
  const topicQuery = TOPIC_QUERIES[topic] || TOPIC_QUERIES.general;
  const regionQuery = region ? `(${region})` : "(Mexico)";
  const keywordQuery = keyword ? `(${keyword})` : "";
  return [topicQuery, regionQuery, keywordQuery, "(Mexico OR mexicano OR mexicana)"]
    .filter(Boolean)
    .join(" ");
}

function buildGoogleNewsRssUrl(query) {
  const url = new URL(GOOGLE_NEWS_RSS_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "es-419");
  url.searchParams.set("gl", "MX");
  url.searchParams.set("ceid", "MX:es-419");
  return url.toString();
}

function buildGdeltQuery({ topic, region, keyword }) {
  const topicTerms = {
    general: "carretera autopista vialidad trafico",
    accidentes: "accidente choque volcadura carretera",
    bloqueos: "bloqueo cierre vial manifestacion carretera",
    clima: "inundacion deslave lluvia carretera",
    seguridad: "asalto carretera inseguridad",
    obras: "obras viales mantenimiento carretera",
  };
  const parts = [topicTerms[topic] || topicTerms.general, region, keyword, "Mexico"]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join(" ");
}

function classifyRoadNewsItem(item = {}) {
  const haystack = `${item.title || ""} ${item.summary || ""}`.toLowerCase();
  const rules = [
    { kind: "accidente", label: "Accidente", patterns: [/accidente/, /choque/, /volcad/, /carambola/, /atropell/] },
    { kind: "bloqueo", label: "Bloqueo / cierre", patterns: [/bloqueo/, /cierre/, /manifestaci/, /carretera cerrada/] },
    { kind: "clima", label: "Clima", patterns: [/lluvia/, /inundaci/, /deslave/, /granizo/, /neblina/] },
    { kind: "obra", label: "Obra vial", patterns: [/obra/, /mantenimiento/, /reparaci/] },
    { kind: "seguridad", label: "Seguridad", patterns: [/asalto/, /robo/, /inseguridad/] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return { alertKind: rule.kind, alertLabel: rule.label };
    }
  }

  return { alertKind: "general", alertLabel: "Vialidad" };
}

function parseRssItems(xmlText) {
  const itemBlocks = String(xmlText || "").match(/<item>[\s\S]*?<\/item>/gi) || [];
  return itemBlocks.map((block, index) => {
    const title = stripHtml(extractTagValue(block, "title"));
    const link = decodeXmlEntities(extractTagValue(block, "link"));
    const source = stripHtml(extractTagValue(block, "source"));
    const description = stripHtml(extractTagValue(block, "description"));
    const pubDate = extractTagValue(block, "pubDate");
    const publishedAtMs = Date.parse(pubDate);

    const base = {
      id: `google-${index}-${title.slice(0, 24)}`,
      title: title || "Sin título",
      link,
      source: source || "Fuente no identificada",
      summary: description || "",
      publishedAt: Number.isFinite(publishedAtMs) ? new Date(publishedAtMs).toISOString() : null,
      publishedAtLabel: pubDate || "",
      provider: "google-news-rss",
    };

    return { ...base, ...classifyRoadNewsItem(base) };
  }).filter((item) => item.link);
}

function parseGdeltArticles(payload = {}) {
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  return articles.map((article, index) => {
    const title = String(article?.title || "").trim() || "Sin título";
    const link = String(article?.url || article?.socialimage || "").trim();
    const source = String(article?.domain || article?.sourcecountry || "GDELT").trim();
    const summary = String(article?.seendate || article?.language || "").trim();
    const publishedAtMs = Date.parse(article?.seendate || "");

    const base = {
      id: `gdelt-${index}-${title.slice(0, 24)}`,
      title,
      link,
      source: source || "GDELT",
      summary,
      publishedAt: Number.isFinite(publishedAtMs) ? new Date(publishedAtMs).toISOString() : null,
      publishedAtLabel: String(article?.seendate || ""),
      provider: "gdelt",
    };

    return { ...base, ...classifyRoadNewsItem(base) };
  }).filter((item) => item.link);
}

function createCacheKey(filters) {
  return JSON.stringify(filters);
}

function dedupeNewsItems(items = []) {
  const seen = new Set();
  const merged = [];

  for (const item of items) {
    const key = String(item?.link || item?.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function filterItemsByHours(items, hours, now = Date.now()) {
  const minTimestamp = now - (hours * 60 * 60 * 1000);
  return items.filter((item) => {
    if (!item.publishedAt) return true;
    const itemMs = Date.parse(item.publishedAt);
    return Number.isFinite(itemMs) ? itemMs >= minTimestamp : true;
  });
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "application/rss+xml, application/xml;q=0.9, application/json, text/xml;q=0.8, */*;q=0.5",
        "Accept-Language": "es-MX,es;q=0.9",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGoogleNewsRss(query) {
  const rssUrl = buildGoogleNewsRssUrl(query);
  const response = await fetchWithTimeout(rssUrl);

  if (!response.ok) {
    throw new Error(`google_news_fetch_failed_${response.status}`);
  }

  const xmlText = await response.text();
  if (!/<rss|<feed|<item>/i.test(xmlText)) {
    throw new Error("google_news_invalid_payload");
  }

  return {
    provider: "google-news-rss",
    rssUrl,
    items: parseRssItems(xmlText),
  };
}

async function fetchGdeltRoadNews({ topic, region, keyword, hours, limit }) {
  const url = new URL(GDELT_DOC_API);
  url.searchParams.set("query", buildGdeltQuery({ topic, region, keyword }));
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("sort", "DateDesc");
  url.searchParams.set("maxrecords", String(Math.min(limit, 25)));
  url.searchParams.set("timespan", `${Math.min(hours, 72)}h`);

  const response = await fetchWithTimeout(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`gdelt_fetch_failed_${response.status}`);
  }

  const text = await response.text();
  if (/please limit/i.test(text)) {
    throw new Error("gdelt_rate_limited");
  }

  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("gdelt_invalid_json");
  }

  return {
    provider: "gdelt",
    rssUrl: url.toString(),
    items: parseGdeltArticles(payload),
  };
}

function getStaleCacheValue(cacheKey, now = Date.now()) {
  const cached = cache.get(cacheKey);
  if (!cached?.value) return null;
  if (now - cached.cachedAt > NEWS_STALE_MAX_MS) return null;
  return cached.value;
}

export async function getRoadNewsForMexico(rawFilters = {}) {
  const topic = normalizeTopic(rawFilters.topic);
  const region = normalizeRegion(rawFilters.region);
  const keyword = sanitizeKeyword(rawFilters.q);
  const hours = normalizeHours(rawFilters.hours);
  const limit = normalizeLimit(rawFilters.limit);

  const filters = { topic, region, keyword, hours, limit };
  const cacheKey = createCacheKey(filters);
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return { ...cached.value, fromCache: true, stale: false };
  }

  const query = buildNewsQuery({ topic, region, keyword });
  const errors = [];
  let mergedItems = [];
  let primarySource = "google-news-rss";
  let rssUrl = buildGoogleNewsRssUrl(query);

  try {
    const googleResult = await fetchGoogleNewsRss(query);
    mergedItems = googleResult.items;
    rssUrl = googleResult.rssUrl;
    primarySource = googleResult.provider;
  } catch (error) {
    errors.push(String(error?.message || "google_news_error"));
  }

  if (mergedItems.length < Math.min(5, limit)) {
    try {
      const gdeltResult = await fetchGdeltRoadNews({ topic, region, keyword, hours, limit });
      mergedItems = dedupeNewsItems([...mergedItems, ...gdeltResult.items]);
      if (!mergedItems.length) {
        primarySource = gdeltResult.provider;
        rssUrl = gdeltResult.rssUrl;
      }
    } catch (error) {
      errors.push(String(error?.message || "gdelt_error"));
    }
  }

  const filteredItems = filterItemsByHours(mergedItems, hours, now).slice(0, limit);

  if (!filteredItems.length) {
    const stale = getStaleCacheValue(cacheKey, now);
    if (stale) {
      return {
        ...stale,
        fromCache: true,
        stale: true,
        warning: "Mostrando última consulta disponible porque las fuentes externas no respondieron.",
        errors,
      };
    }

    if (errors.length) {
      throw new Error(errors[0]);
    }

    return {
      source: primarySource,
      sources: [],
      rssUrl,
      query,
      filters,
      items: [],
      total: 0,
      generatedAt: new Date(now).toISOString(),
      fromCache: false,
      stale: false,
      alertSummary: {},
      errors,
    };
  }

  const alertSummary = filteredItems.reduce((acc, item) => {
    const key = item.alertKind || "general";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const result = {
    source: primarySource,
    sources: dedupeNewsItems(mergedItems).length > filteredItems.length
      ? ["google-news-rss", "gdelt"].filter((name, index, list) => list.indexOf(name) === index)
      : [primarySource],
    rssUrl,
    query,
    filters,
    items: filteredItems,
    total: filteredItems.length,
    generatedAt: new Date(now).toISOString(),
    fromCache: false,
    stale: false,
    alertSummary,
    errors: errors.length ? errors : undefined,
  };

  cache.set(cacheKey, {
    expiresAt: now + NEWS_CACHE_TTL_MS,
    cachedAt: now,
    value: result,
  });

  return result;
}
