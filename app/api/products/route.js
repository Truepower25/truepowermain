import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const { data: products } = await getProducts({ search, limit: 6 });
    return Response.json(products);
}
