import { NextRequest, NextResponse } from "next/server";
import { addRating, getShopRatings, getShopAverageRating, getShop, ensureMigrated } from "@/lib/db";

// GET - Fetch ratings for a shop (public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const ratings = await getShopRatings(id);
  const average = await getShopAverageRating(id);
  return NextResponse.json({ ratings, average });
}

// POST - Submit a rating (public, require shop_id in body)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureMigrated();
    const { id } = await params;
    const shop = await getShop(id);
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const body = await req.json();
    const { rating, comment, customerName, entryId } = body;

    // Validate rating
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedComment = typeof comment === "string" ? comment.replace(/[<>&"']/g, "").trim().slice(0, 500) : "";
    const sanitizedName = typeof customerName === "string" ? customerName.replace(/[<>&"']/g, "").trim().slice(0, 100) : "";

    const newRating = await addRating({
      shopId: id,
      entryId: entryId || undefined,
      rating: Math.round(rating),
      comment: sanitizedComment,
      customerName: sanitizedName,
    });

    return NextResponse.json({ rating: newRating }, { status: 201 });
  } catch (e: any) {
    console.error("POST ratings error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
