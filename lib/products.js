

import { hasSupabaseConfig, supabase } from '@/lib/supabase.js'
import { getSettingsData, safeJson } from './common.js'

// ── Products ──────────────────────────────────────────────────────────────────
// Your DB uses: cat, desc, image_url, images
// The app uses: images


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


export async function getProducts({
    category,
    search,
    page = 1,
    pageSize = 20,
    sort = null,
    skipOrder = false,
    excludeId = false,
    limit = false,
    subCategory = null,
} = {}) {
    if (!hasSupabaseConfig()) {
        return {
            data: [],
            pagination: {
                totalItems: 0,
                totalPages: 0,
                currentPage: page,
                pageSize,
            },
        };
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 👉 Base query (count included)
    let q = supabase
        .from("products")
        .select("*", { count: "exact" });

    if (subCategory) {
        q = q.eq("cat", subCategory);
    }
    else {
        if (category) {
            if (category === "water_heaters" || category === "standard" || category === "pump" || category === "showerhead" || category === "accessory") {
                q = q.in("cat", ["standard", "pump", "showerhead", "accessory"]);
            } else {
                q = q.eq("cat", category);
            }
        }
    }
    if (excludeId) {
        q = q.notIn('id', [excludeId])
    }

    if (search) {
        q = q.ilike("name", `%${search}%`);
    }



    if (sort === "price-asc") q = q.order("price", { ascending: true });
    else if (sort === "price-desc") q = q.order("price", { ascending: false });
    else if (sort === "newest") q = q.order("created_at", { ascending: false });

    // 👉 Pagination applied in DB (important)
    q = q.range(from, to);

    if (limit) {
        q = q.limit(limit);
    }

    const { data, error, count } = await q;

    if (error) throw error;
    let normalized;
    if (category || search || sort || subCategory) {
        skipOrder = true; // don't apply custom order if filters/sorting is active
    }

    normalized = (data || []).map(normalizeProduct);

    // 🚀 Skip custom ordering if needed
    if (!skipOrder) {
        const settings = await getSettingsData();
        const keyValue = settings.products_order;

        const orderIds = keyValue ? await safeJson(keyValue, []) : [];
        normalized = sortProductsBySavedOrder(normalized, orderIds);
    }

    const totalItems = count || 0;

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
        data: normalized,
        pagination: {
            totalItems,
            totalPages,
            currentPage: page,
            pageSize,
        }
    };
}

export async function getProduct(id) {
    if (!hasSupabaseConfig()) return null;

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error || !data) return null;
    return normalizeProduct(data);
}



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



