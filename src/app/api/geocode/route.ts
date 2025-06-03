import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json();
    const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
console.log("GOOGLE_MAPS_API_KEY from env:", GOOGLE_MAPS_API_KEY);

    if (!lat || !lng) return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") return NextResponse.json({ error: "Geocode failed" }, { status: 400 });

    // Pick the first result
    const result = data.results[0];
    const addressComponents = result.address_components;

    // Helper to extract city, state, country
    const getComponent = (types: string[]) =>
      addressComponents.find((c: any) => types.every((t) => c.types.includes(t)))?.long_name || "";

    const city =
      getComponent(["locality"]) ||
      getComponent(["administrative_area_level_2"]) ||
      getComponent(["sublocality"]);
    const state = getComponent(["administrative_area_level_1"]);
    const country = getComponent(["country"]);

    return NextResponse.json({
      address: result.formatted_address,
      city,
      state,
      country,
      lat,
      lng,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
