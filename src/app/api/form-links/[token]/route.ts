import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePDFAndSave } from '@/lib/pdfUtil';
import type { NextRequest } from 'next/server';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
const toRad = (x: number): number => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ------------- Yahan GET handler add karo -------------
export async function GET(req: NextRequest, context: any) {
  const { token } = context.params;
  const form = await prisma.formLinks.findUnique({
    where: { token },
    select: {
      candidateName: true,
      houseNo: true,
      nearby: true,
      area: true,
      zipCode: true,
      city: true,
      state: true,
      country: true,
      status: true,
      responsePDF: true,
      createdAt: true,
      photos: true, // Only if you're storing photos
    }
  });

  if (!form) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, form });
}
// ------------------------------------------------------

export async function POST(req, context) {
  const { params } = context;
  const awaitedParams = await params;
  const { token } = awaitedParams;

  const body = await req.json();
  const { response, gpsLocation } = body;

  const existing = await prisma.formLinks.findUnique({ where: { token } });
  if (!existing) return NextResponse.json({ ok: false, error: "Link not found" }, { status: 404 });
  if (existing.status === 'submitted') return NextResponse.json({ ok: false, error: "Already submitted" }, { status: 403 });

  // Address string ready karo
  const addressString = [
    existing.houseNo,
    existing.nearby,
    existing.area,
    existing.city,
    existing.state,
    existing.zipCode,
    existing.country
  ].filter(Boolean).join(", ");
  console.log("ADDRESS SENT TO GEOCODE:", addressString);


  // 1. Geocode Address
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  console.log("GOOGLE_MAPS_API_KEY from env:", GOOGLE_MAPS_API_KEY);

  const geoRes = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${GOOGLE_MAPS_API_KEY}`
  );
  const geoData = await geoRes.json();
  if (!geoData.results.length) return NextResponse.json({ ok: false, error: "Geocode failed" });

  const addressCoords = geoData.results[0].geometry.location;

  // 2. Validate Distance
  const dist = getDistance(
    addressCoords.lat,
    addressCoords.lng,
    gpsLocation.lat,
    gpsLocation.lng
  );
  if (dist > 10000) {
    return NextResponse.json({
      ok: false,
      error: `Your live location is too far from address! (${Math.round(dist)}m)`
    });
  }

  // 3. Google Static Map Image URL
  const staticMapUrl =
    `https://maps.googleapis.com/maps/api/staticmap?size=640x400&zoom=16` +
    `&markers=color:blue|label:S|${addressCoords.lat},${addressCoords.lng}` +
    `&markers=color:green|label:G|${gpsLocation.lat},${gpsLocation.lng}` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  // 4. Generate PDF with map/table (pass map url, addressCoords, gpsLocation, etc.)
  const filename = `response-${token}-${Date.now()}.pdf`;
  const pdfPath = await generatePDFAndSave({
    ...existing,
    userResponse: response,
    submittedAt: new Date().toLocaleString(),
    staticMapUrl,
    addressCoords,
    gpsLocation,
  }, filename);

  await prisma.formLinks.update({
    where: { token },
    data: {
      status: 'submitted',
      responsePDF: pdfPath,
    }
  });

  return NextResponse.json({ ok: true });
}
