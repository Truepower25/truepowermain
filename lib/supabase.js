
import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL =
  "https://nwhjgialubqocbbmbmug.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53aGpnaWFsdWJxb2NiYm1ibXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODMxNjEsImV4cCI6MjA5Mjg1OTE2MX0.il3DW8g9jZdw8yCVytul1_MAjpHFzRjE5Ur6tG8g76M";

let supabaseClient = null;

export function hasSupabaseConfig() {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY),
  );
}

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabaseClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);


function normalizeProduct(row) {
  if (!row) return row;

  const images = Array.isArray(row.images)
    ? row.images
    : row.images
      ? [row.images]
      : row.image_url
        ? [row.image_url]
        : [];

  return {
    ...row,
    cat: row.cat ?? row.category ?? null,
    category: row.category ?? row.cat ?? null,
    desc: row.desc ?? row.description ?? "",
    description: row.description ?? row.desc ?? "",
    images,
    image_url: row.image_url ?? images[0] ?? null,
  };
}

function sortProductsBySavedOrder(products, orderIds = []) {
  const orderMap = new Map(orderIds.map((id, index) => [String(id), index]));

  return [...products].sort((a, b) => {
    const aIndex = orderMap.get(String(a.id));
    const bIndex = orderMap.get(String(b.id));

    if (aIndex != null && bIndex != null) return aIndex - bIndex;
    if (aIndex != null) return -1;
    if (bIndex != null) return 1;

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

// ── Products ──────────────────────────────────────────────────────────────────
// Your DB uses: cat, desc, image_url, images
// The app uses: images

export async function getProducts({ category, search, limit, skipOrder } = {}) {
  let q = supabase.from("products").select("*");

  if (category && category !== "all") q = q.eq("cat", category);
  if (search) q = q.ilike("name", `%${search}%`);

  const { data, error } = await q;
  if (error) throw error;

  const normalized = (data || []).map(normalizeProduct);

  // 🚀 Skip expensive ordering during search
  if (skipOrder) {
    return limit ? normalized.slice(0, limit) : normalized;
  }

  const orderIds = await getProductOrder();
  const sorted = sortProductsBySavedOrder(normalized, orderIds);

  return limit ? sorted.slice(0, limit) : sorted;
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return normalizeProduct(data);
}

export async function upsertProduct(product) {
  // Map to actual DB column names
  const dbProduct = {
    id: product.id,
    name: product.name,
    cat: product.category || product.cat,
    catLabel: product.catLabel,
    price: Number(product.price),
    desc: product.description || product.desc,
    model: product.model,
    badge: product.badge,
    features: product.features || [],
    specs: product.specs || {},
    images: product.images || [],
    image_url: product.image_url || product.images?.[0] || null,
    original_price: product.original_price,
    updated_at: new Date(),
  };

  const { data, error } = await supabase
    .from("products")
    .upsert(dbProduct)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ── Settings (key/value table) ─────────────────────────────────────────────────
export async function getSettings() {
  const { data } = await supabase.from("settings").select("key, value");
  if (!data) return {};

  const map = {};
  data.forEach((r) => {
    map[r.key] = r.value;
  });

  return {
    whatsapp_number: map.whatsapp_number || map.wa_number || "254701039256",
    hero_title: map.hero_title || "Hot Water.\nEvery Morning.",
    hero_subtitle:
      map.hero_subtitle ||
      "Instant showers, solar and electrical solutions - selected for Kenyan homes, borehole water, and low-pressure plumbing.",
    stat_customers: map.stat_customers || "500+",
    stat_rating: map.stat_rating || "4.9★",
    home_media: safeJson(map.home_media_json, []),
    raw: map, // expose raw in case admin needs it
  };
}

export async function saveSetting(key, value) {
  const { error } = await supabase
    .from("settings")
    .upsert(
      { key, value: typeof value === "string" ? value : JSON.stringify(value) },
      { onConflict: "key" },
    );
  if (error) throw error;
}

export async function getProductOrder() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "products_order")
    .maybeSingle();

  if (error) throw error;
  return safeJson(data?.value, []);
}

export async function saveProductOrder(productIds) {
  await saveSetting("products_order", productIds.map(String));
}

// ── Testimonials ───────────────────────────────────────────────────────────────
export async function getTestimonials() {
  if (!hasSupabaseConfig()) return [];

  // Try real table first (after migration), fall back to settings JSON
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data?.length) return data;

  // Fallback: read from settings JSON (pre-migration)
  const { data: rows } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "testimonials_json")
    .single();

  const arr = safeJson(rows?.value, []);
  return arr.map((t, i) => ({
    id: i,
    name: t.name,
    text: t.quote || t.text,
    rating: t.rating || 5,
    location: t.location || "Nairobi",
  }));
}

export async function getGalleryImages() {
  if (!hasSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

// ── Editable page content CMS ───────────────────────────────────────────────
export async function getPageContent(pageSlug) {
  if (!hasSupabaseConfig()) return {};

  const { data, error } = await supabase
    .from("page_content")
    .select("section_key, content")
    .eq("page_slug", pageSlug);

  if (error) throw error;

  const result = {};
  data.forEach((item) => {
    result[item.section_key] = item.content;
  });
  return result;
}

export async function updatePageContent(pageSlug, sectionKey, content) {
  const { data, error } = await supabase
    .from("page_content")
    .upsert(
      {
        page_slug: pageSlug,
        section_key: sectionKey,
        content,
        updated_at: new Date(),
      },
      { onConflict: "page_slug, section_key" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAllPageContent() {
  if (!hasSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from("page_content")
    .select("*")
    .order("page_slug", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ── Profiles & Orders ───────────────────────────────────────────────────────
export async function getProfile(userId) {
  if (!userId) return null;
  if (!hasSupabaseConfig()) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...profile, updated_at: new Date() }, { onConflict: "id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrdersByUser(userId) {
  if (!userId) return [];
  if (!hasSupabaseConfig()) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrderById(orderId) {
  if (!orderId) return null;
  if (!hasSupabaseConfig()) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// ── Admin management helpers ─────────────────────────────────────────────────
export async function getAdmins() {
  if (!hasSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role")
    .eq("role", "admin")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function promoteUserToAdmin(email) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "admin", updated_at: new Date() })
    .eq("email", email)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ||
      "Unable to promote user. Ensure the user exists and has signed up.",
    );
  }

  if (data) {
    return data;
  }

  // If no profile row exists yet, create one with admin role
  const { data: created, error: createError } = await supabase
    .from("profiles")
    .upsert(
      { email, role: "admin", updated_at: new Date() },
      { onConflict: "email" },
    )
    .select()
    .maybeSingle();

  if (createError) {
    throw new Error(createError.message || "Unable to create admin profile.");
  }
  return created;
}

export async function demoteAdmin(id) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "user", updated_at: new Date() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to demote admin.");
  }
  if (!data) {
    throw new Error("Admin user not found.");
  }
  return data;
}

// ── Page Content Schema (for visual editor) ─────────────────────────────────
export function getPageSectionSchemas() {
  return {
    about: {
      hero: {
        label: "Hero Section",
        description: "Main headline and subtitle at the top of the About page",
        schema: [
          {
            name: "badge",
            label: "Badge Text",
            type: "text",
            placeholder: "🇰🇪 About TruePower",
          },
          {
            name: "title",
            label: "Main Title",
            type: "text",
            placeholder: "Hot water for every Kenyan home.",
          },
          {
            name: "subtitle",
            label: "Subtitle",
            type: "textarea",
            rows: 2,
            placeholder: "Electric showers, instant showers...",
          },
        ],
      },
      stats: {
        label: "Statistics",
        description: "Numbers that show your impact (Customers, Rating, etc.)",
        schema: [
          {
            name: "items",
            label: "Stat Items",
            type: "array",
            itemLabel: "Stat",
            itemTemplate: { value: "", label: "", icon: "Users" },
            itemFields: [
              {
                name: "value",
                label: "Value",
                type: "text",
                placeholder: "500+",
              },
              {
                name: "label",
                label: "Label",
                type: "text",
                placeholder: "Customers Served",
              },
              {
                name: "icon",
                label: "Icon Name",
                type: "text",
                placeholder: "Users, Star, Zap, MapPin",
              },
            ],
          },
        ],
      },
      story: {
        label: "Our Story",
        description: "The story behind TruePower",
        schema: [
          {
            name: "title",
            label: "Section Title",
            type: "text",
            placeholder: "Built by Kenyans, for Kenyans",
          },
          {
            name: "paragraphs",
            label: "Story Paragraphs",
            type: "array",
            itemLabel: "Paragraph",
            itemTemplate: "",
            itemFields: [
              { name: "text", label: "Paragraph", type: "textarea", rows: 3 },
            ],
          },
          {
            name: "features",
            label: "Feature Badges",
            type: "array",
            itemLabel: "Feature",
            itemTemplate: "",
            itemFields: [
              {
                name: "text",
                label: "Feature",
                type: "text",
                placeholder: "Borehole Tested",
              },
            ],
          },
        ],
      },
      showroom: {
        label: "Showroom Info",
        description: "Location, hours, and contact details",
        schema: [
          {
            name: "title",
            label: "Section Title",
            type: "text",
            placeholder: "Nyamakima Showroom, Nairobi CBD",
          },
          {
            name: "address",
            label: "Address",
            type: "text",
            placeholder: "Nyamakima, Nairobi CBD",
          },
          {
            name: "phone",
            label: "Phone Number",
            type: "text",
            placeholder: "+254 701 039 256",
          },
          {
            name: "hours",
            label: "Opening Hours",
            type: "array",
            itemLabel: "Hour Entry",
            itemTemplate: { day: "", hours: "" },
            itemFields: [
              {
                name: "day",
                label: "Day",
                type: "text",
                placeholder: "Monday – Friday",
              },
              {
                name: "hours",
                label: "Hours",
                type: "text",
                placeholder: "8:00 AM – 6:00 PM",
              },
            ],
          },
        ],
      },
      cta: {
        label: "Call to Action",
        description: "Final WhatsApp CTA section",
        schema: [
          {
            name: "title",
            label: "Title",
            type: "text",
            placeholder: "Ready to order?",
          },
          {
            name: "subtitle",
            label: "Subtitle",
            type: "textarea",
            rows: 2,
            placeholder: "Chat with us...",
          },
          {
            name: "button_text",
            label: "Button Text",
            type: "text",
            placeholder: "Chat Now on WhatsApp",
          },
          {
            name: "button_link",
            label: "WhatsApp Link",
            type: "text",
            placeholder: "https://wa.me/254701039256",
          },
        ],
      },
    },
    portfolio: {
      hero: {
        label: "Hero Section",
        description: "Main headline for Portfolio page",
        schema: [
          {
            name: "badge",
            label: "Badge Text",
            type: "text",
            placeholder: "TruePower Portfolio",
          },
          {
            name: "title",
            label: "Main Title",
            type: "text",
            placeholder: "Our Portfolio",
          },
          {
            name: "subtitle",
            label: "Subtitle",
            type: "textarea",
            rows: 2,
            placeholder: "Real installations, genuine reviews...",
          },
        ],
      },
      stats: {
        label: "Top Stats",
        description: "The 4 statistic cards shown under the hero section",
        schema: [
          {
            name: "items",
            label: "Stat Items",
            type: "array",
            itemLabel: "Stat",
            itemTemplate: { value: "", label: "", icon: "Users" },
            itemFields: [
              {
                name: "value",
                label: "Value",
                type: "text",
                placeholder: "500+",
              },
              {
                name: "label",
                label: "Label",
                type: "text",
                placeholder: "Happy Customers",
              },
              {
                name: "icon",
                label: "Icon Name",
                type: "text",
                placeholder: "Users, Star, MessageCircle, Truck",
              },
            ],
          },
        ],
      },
      how_it_works: {
        label: "How It Works (3 Steps)",
        description: "The 3-step process",
        schema: [
          {
            name: "title",
            label: "Section Title",
            type: "text",
            placeholder: 'From "I Need Hot Water" to "This is Perfect"',
          },
          {
            name: "subtitle",
            label: "Subtitle",
            type: "text",
            placeholder: "3 simple steps. No confusion.",
          },
          {
            name: "steps",
            label: "Steps",
            type: "array",
            itemLabel: "Step",
            itemTemplate: { step: "", title: "", description: "", icon: "" },
            itemFields: [
              {
                name: "step",
                label: "Step Number",
                type: "text",
                placeholder: "01",
              },
              {
                name: "title",
                label: "Title",
                type: "text",
                placeholder: "Tell Us Your Situation",
              },
              {
                name: "description",
                label: "Description",
                type: "textarea",
                rows: 2,
                placeholder: "Explain what the customer needs to do...",
              },
            ],
          },
        ],
      },
      services: {
        label: "Services / What Makes Us Different",
        description: "The 4 key selling points",
        schema: [
          {
            name: "title",
            label: "Section Title",
            type: "text",
            placeholder: "What makes us different",
          },
          {
            name: "items",
            label: "Service Items",
            type: "array",
            itemLabel: "Service",
            itemTemplate: { title: "", description: "", icon: "" },
            itemFields: [
              {
                name: "title",
                label: "Title",
                type: "text",
                placeholder: "Borehole Ready",
              },
              {
                name: "description",
                label: "Description",
                type: "textarea",
                rows: 2,
                placeholder: "Heavy-duty copper coils...",
              },
            ],
          },
        ],
      },
      cta: {
        label: "Call to Action",
        description: "Final CTA section",
        schema: [
          {
            name: "title",
            label: "Title",
            type: "text",
            placeholder: "Ready to get hot water working perfectly?",
          },
          {
            name: "subtitle",
            label: "Subtitle",
            type: "textarea",
            rows: 2,
            placeholder: "Chat with us...",
          },
          {
            name: "button_text",
            label: "Primary Button Text",
            type: "text",
            placeholder: "WhatsApp Us",
          },
          {
            name: "secondary_button_text",
            label: "Secondary Button Text",
            type: "text",
            placeholder: "Browse Products",
          },
          {
            name: "secondary_button_link",
            label: "Secondary Button Link",
            type: "text",
            placeholder: "/shop",
          },
        ],
      },
    },
  };
}

export async function upsertTestimonial(t) {
  const { error } = await supabase.from("testimonials").upsert(t);
  if (error) throw error;
}

export async function deleteTestimonial(id) {
  await supabase.from("testimonials").delete().eq("id", id);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, fullName) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
}

export async function resetPassword(email, redirectTo) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  });
}

export async function isAdminUser(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === "admin";
}

export async function createCustomer(customer) {
  // Upsert into profiles table, not customers
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: customer.user_id,
      email: customer.email,
      name: customer.name,
      role: "user",
      updated_at: new Date(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createOrder(order) {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUser() {
  return getUser();
}

// ── Storage ───────────────────────────────────────────────────────────────────
export async function uploadImage(file, bucket = "products") {
  const ext = file.name.split(".").pop();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(name, file);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(name);
  return data.publicUrl;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeJson(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

// Alias used by AdminPage
export async function saveSettings(settingsObj) {

  const entries = Object.entries(settingsObj);
  for (const [key, value] of entries) {
    await saveSetting(key, value);
  }

}
