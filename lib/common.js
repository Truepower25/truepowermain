import { hasSupabaseConfig, supabase } from '@/lib/supabase.js'

export async function getSettingsData() {
    if (!hasSupabaseConfig()) return {};

    const { data } = await supabase.from("settings").select("key, value");
    if (!data) return {};

    const map = {};
    data.forEach((r) => {
        map[r.key] = r.value;
    });

    return map;
}

export async function getSettings() {
    const map = await getSettingsData();

    return {
        whatsapp_number: map.whatsapp_number || map.wa_number || "254701039256",
        hero_title: map.hero_title || "Hot Water.\nEvery Morning.",
        hero_subtitle:
            map.hero_subtitle ||
            "Instant showers, solar and electrical solutions - selected for Kenyan homes, borehole water, and low-pressure plumbing.",
        stat_customers: map.stat_customers || "500+",
        stat_rating: map.stat_rating || "4.9/5",
        home_media: safeJson(map.home_media_json, []),
        raw: map, // expose raw in case admin needs it
    };
}

// Helpers
export function safeJson(str, fallback) {
    try {
        return str ? JSON.parse(str) : fallback;
    } catch {
        return fallback;
    }
}
