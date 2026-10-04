import { supabase, hasSupabaseConfig } from "./supabase"

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
const ANALYTICS_TABLE = "site_analytics_events"
const VISITOR_ID_KEY = "tp_visitor_id"
const SESSION_KEY = "tp_analytics_session"
const SESSION_TTL_MS = 30 * 60 * 1000
let analyticsPersistenceDisabled = false

let hasConfiguredAnalytics = false
let analyticsScriptPromise

function canUseAnalytics() {
  return typeof window !== 'undefined' && Boolean(MEASUREMENT_ID)
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || []
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments)
    }
}

function loadAnalyticsScript() {
  if (!canUseAnalytics()) return Promise.resolve(false)
  if (analyticsScriptPromise) return analyticsScriptPromise

  analyticsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-ga4="${MEASUREMENT_ID}"]`)
    if (existingScript) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    script.dataset.ga4 = MEASUREMENT_ID
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load Google Analytics'))
    document.head.appendChild(script)
  }).catch((error) => {
    analyticsScriptPromise = undefined
    console.error(error)
    return false
  })

  return analyticsScriptPromise
}

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

function toNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`
}

function getDeviceType(userAgent = "") {
  const ua = userAgent.toLowerCase()
  if (/tablet|ipad/.test(ua)) return "tablet"
  if (/mobi|android|iphone|ipod|phone/.test(ua)) return "mobile"
  return "desktop"
}

function getReferrerDomain(referrer = "") {
  if (!referrer) return "direct"

  try {
    return new URL(referrer).hostname || "direct"
  } catch {
    return "direct"
  }
}

function looksLikeBot(userAgent = "") {
  const ua = userAgent.toLowerCase()
  return /bot|crawl|spider|slurp|preview|fetch|headless/.test(ua)
}

function getStoredJson(key, fallback) {
  if (typeof window === "undefined") return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setStoredJson(key, value) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures.
  }
}

function getVisitorId() {
  const existing = getStoredJson(VISITOR_ID_KEY, "")
  if (existing) return existing

  const next = randomId()
  setStoredJson(VISITOR_ID_KEY, next)
  return next
}

function getSessionId() {
  const now = Date.now()
  const existing = getStoredJson(SESSION_KEY, null)

  if (existing?.id && existing?.expiresAt && existing.expiresAt > now) {
    const next = { ...existing, expiresAt: now + SESSION_TTL_MS }
    setStoredJson(SESSION_KEY, next)
    return next.id
  }

  const next = {
    id: randomId(),
    expiresAt: now + SESSION_TTL_MS,
  }
  setStoredJson(SESSION_KEY, next)
  return next.id
}

function buildAnalyticsContext() {
  if (typeof window === "undefined") return null

  return {
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    deviceType: getDeviceType(window.navigator?.userAgent || ""),
    referrerDomain: getReferrerDomain(document.referrer || ""),
    isBot: looksLikeBot(window.navigator?.userAgent || ""),
    pagePath: `${window.location.pathname}${window.location.search || ""}`,
  }
}

async function persistAnalyticsEvent(eventName, params = {}) {
  if (analyticsPersistenceDisabled || !hasSupabaseConfig() || typeof window === "undefined") {
    return false
  }

  const context = buildAnalyticsContext()
  if (!context) return false

  try {
    const payload = {
      event_name: eventName,
      page_path: params.page_path || context.pagePath,
      visitor_id: context.visitorId,
      session_id: context.sessionId,
      country_name: params.country_name || null,
      device_type: params.device_type || context.deviceType,
      referrer_domain: params.referrer_domain || context.referrerDomain,
      is_bot: Boolean(params.is_bot ?? context.isBot),
      metadata: cleanParams(params),
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from(ANALYTICS_TABLE).insert(payload)
    if (error) throw error
    return true
  } catch (error) {
    const status = error?.status || error?.statusCode
    const code = String(error?.code || "")
    const isRlsBlock = status === 403 || code === "42501"

    if (isRlsBlock) {
      analyticsPersistenceDisabled = true
      console.warn(
        "Analytics persistence is blocked by Supabase RLS. Apply the site_analytics_events policies to enable dashboard data.",
      )
      return false
    }

    console.error("Analytics persistence failed:", error)
    return false
  }
}

function getProductCategory(product = {}) {
  return product.catLabel || product.category || product.cat || 'Uncategorized'
}

function buildAnalyticsItem(product = {}, overrides = {}) {
  return cleanParams({
    item_id: String(product.id ?? product.sku ?? product.model ?? product.name ?? 'unknown'),
    item_name: product.name || 'Unknown product',
    item_brand: 'TruePower Kenya',
    item_category: getProductCategory(product),
    item_variant: product.model || undefined,
    price: toNumber(product.price),
    quantity: overrides.quantity ?? product.qty ?? 1,
    index: overrides.index,
    item_list_id: overrides.item_list_id,
    item_list_name: overrides.item_list_name,
  })
}

function buildAnalyticsItems(products = [], overrides = {}) {
  return products.map((product, index) =>
    buildAnalyticsItem(product, {
      ...overrides,
      index: overrides.index ?? index + 1,
      quantity: overrides.quantityMap?.[String(product.id)] ?? product.qty ?? overrides.quantity,
    })
  )
}

function getItemsValue(items = []) {
  return items.reduce((sum, item) => sum + (toNumber(item.price) * toNumber(item.quantity || 1)), 0)
}

export function initializeAnalytics() {
  if (!canUseAnalytics()) return false

  ensureGtag()

  if (!hasConfiguredAnalytics) {
    window.gtag('js', new Date())
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false })
    hasConfiguredAnalytics = true
  }

  void loadAnalyticsScript()
  return true
}

export function trackEvent(eventName, params = {}) {
  if (!initializeAnalytics()) return false
  window.gtag('event', eventName, cleanParams(params))
  void persistAnalyticsEvent(eventName, params)
  return true
}

export function trackPageView(pagePath) {
  if (!initializeAnalytics()) return

  window.requestAnimationFrame(() => {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title || window.location.hostname,
    })
    void persistAnalyticsEvent('page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title || window.location.hostname,
    })
  })
}

export function trackSearch(searchTerm, params = {}) {
  if (!searchTerm?.trim()) return
  trackEvent('search', {
    search_term: searchTerm.trim(),
    ...params,
  })
}

export function trackViewItemList(products = [], params = {}) {
  if (!products.length) return
  const items = buildAnalyticsItems(products, params)
  trackEvent('view_item_list', {
    item_list_id: params.item_list_id,
    item_list_name: params.item_list_name,
    items,
  })
}

export function trackSelectItem(product, params = {}) {
  if (!product) return
  trackEvent('select_item', {
    item_list_id: params.item_list_id,
    item_list_name: params.item_list_name,
    items: [buildAnalyticsItem(product, params)],
  })
}

export function trackViewItem(product, params = {}) {
  if (!product) return
  const quantity = params.quantity ?? product.qty ?? 1
  const item = buildAnalyticsItem(product, { ...params, quantity })
  trackEvent('view_item', {
    currency: 'KES',
    value: toNumber(product.price) * toNumber(quantity),
    items: [item],
  })
}

export function trackAddToCart(product, quantity = 1, params = {}) {
  if (!product || quantity < 1) return
  const item = buildAnalyticsItem(product, { ...params, quantity })
  trackEvent('add_to_cart', {
    currency: 'KES',
    value: toNumber(product.price) * toNumber(quantity),
    items: [item],
  })
}

export function trackRemoveFromCart(product, quantity = 1, params = {}) {
  if (!product || quantity < 1) return
  const item = buildAnalyticsItem(product, { ...params, quantity })
  trackEvent('remove_from_cart', {
    currency: 'KES',
    value: toNumber(product.price) * toNumber(quantity),
    items: [item],
  })
}

export function trackViewCart(cart = [], params = {}) {
  if (!cart.length) return
  const items = buildAnalyticsItems(cart, params)
  trackEvent('view_cart', {
    currency: 'KES',
    value: getItemsValue(items),
    items,
  })
}

export function trackBeginCheckout(itemsOrCart = [], params = {}) {
  if (!itemsOrCart.length) return
  const items = buildAnalyticsItems(itemsOrCart, params)
  trackEvent('begin_checkout', {
    currency: 'KES',
    value: getItemsValue(items),
    items,
    checkout_method: params.checkout_method,
  })
}

export { MEASUREMENT_ID }
