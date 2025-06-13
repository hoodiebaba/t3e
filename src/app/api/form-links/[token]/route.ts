// src/app/api/form-links/[token]/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePDFAndSave } from '@/lib/pdfUtil'; // Ensure this path is correct
import type { NextRequest } from 'next/server';

// Haversine distance function (Ismein koi badlav nahi)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number): number => (x * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
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

// ================== GET Handler ==================
export async function GET(
  req: NextRequest,
  context: { params: { token: string } }
) {
  // ✅ FIX: `context.params` ek direct object hai, Promise nahi.
  // Isliye yahan 'await' ki zaroorat nahi hai.
const { token } = await context.params;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token parameter is missing" }, { status: 400 });
  }

  try {
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
        formType: true,
        createdBy: true,
      }
    });

    if (!form) {
      return NextResponse.json({ ok: false, error: "Form link not found or invalid" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, form });
  } catch (error) {
    console.error("API GET HANDLER: Error fetching form data from DB:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ ok: false, error: `Failed to retrieve form data: ${errorMessage}` }, { status: 500 });
  }
}

// ================== POST Handler ==================
export async function POST(
  req: NextRequest,
  // ✅ FIX: 'context' ko 'any' type dene ke bajaye, sahi type di gayi hai.
  // Isse code zyada safe aur clean rehta hai.
  context: { params: { token: string } }
) {
  // ✅ FIX: Yahan bhi 'await' hata diya gaya hai aur 'token' seedhe nikal liya hai.
const { token } = await context.params;
  console.log("API POST HANDLER: Request received for /api/form-links/[token]");

  const submissionPayload = await req.json();

  // Database se existing record fetch karna
  const existing = await prisma.formLinks.findUnique({
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
      formType: true,
      createdBy: true,
    }
  });

  if (!existing) {
    console.log("API POST HANDLER: Link not found for token:", token);
    return NextResponse.json({ ok: false, error: "Link not found" }, { status: 404 });
  }
  if (existing.status === 'submitted') {
    console.log("API POST HANDLER: Link already submitted for token:", token);
    return NextResponse.json({ ok: false, error: "Link already submitted" }, { status: 403 });
  }

  const candidateAddressString = [
    existing.houseNo,
    existing.area,
    existing.nearby,
    existing.city,
    existing.state,
    existing.zipCode,
    existing.country
  ].filter(Boolean).join(", ");

  const ACTUAL_Maps_API_KEY = process.env.Maps_API_KEY;

  if (!ACTUAL_Maps_API_KEY) {
    console.error("API POST HANDLER ERROR: Maps_API_KEY environment variable set nahi hai.");
    return NextResponse.json({ ok: false, error: "Server configuration error (missing API key)" }, { status: 500 });
  }

  let addressCoords;
  try {
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(candidateAddressString)}&key=${ACTUAL_Maps_API_KEY}`
    );
    const geoData = await geoRes.json();
    if (!geoRes.ok || !geoData.results || geoData.results.length === 0) {
      console.error("API POST HANDLER: Geocoding failed.", { address: candidateAddressString, status: geoRes.status, responseStatusText: geoRes.statusText, geoError: geoData.error_message, geoStatus: geoData.status });
      return NextResponse.json({ ok: false, error: `Failed to geocode candidate address. Google API Status: ${geoData.status}. Message: ${geoData.error_message || 'No results found or other API error.'}` }, { status: 400 });
    }
    addressCoords = geoData.results[0].geometry.location;
  } catch (geoError) {
    console.error("API POST HANDLER: Geocoding fetch network error:", geoError);
    const errorMessage = geoError instanceof Error ? geoError.message : "Unknown geocoding network error.";
    return NextResponse.json({ ok: false, error: `Geocoding service connection error: ${errorMessage}` }, { status: 500 });
  }

  if (!submissionPayload.gpsLocation || typeof submissionPayload.gpsLocation.lat !== 'number' || typeof submissionPayload.gpsLocation.lng !== 'number') {
    return NextResponse.json({ ok: false, error: "Valid GPS location from respondent is missing." }, { status: 400 });
  }

  const dist = getDistance(
    addressCoords.lat,
    addressCoords.lng,
    submissionPayload.gpsLocation.lat,
    submissionPayload.gpsLocation.lng
  );

  const MAX_ALLOWED_DISTANCE_METERS = process.env.MAX_DISTANCE_METERS ? parseInt(process.env.MAX_DISTANCE_METERS) : 10000;
  if (dist > MAX_ALLOWED_DISTANCE_METERS) {
    return NextResponse.json({
      ok: false,
      error: `Your live location is too far from the registered address (${Math.round(dist)}m away).`
    }, { status: 400 });
  }

  const staticMapUrl =
    `https://maps.googleapis.com/maps/api/staticmap?size=600x400` +
    `&markers=color:blue|label:A|${addressCoords.lat},${addressCoords.lng}` +
    `&markers=color:green|label:R|${submissionPayload.gpsLocation.lat},${submissionPayload.gpsLocation.lng}` +
    `&key=${ACTUAL_Maps_API_KEY}`;

  const pdfData = {
    candidateName: existing.candidateName,
    houseNo: existing.houseNo,
    area: existing.area,
    landmarkForAddress: existing.nearby,
    city: existing.city,
    state: existing.state,
    zipCode: existing.zipCode,
    country: existing.country,
    requestedBy: existing.createdBy,
    formType: existing.formType,
    verifierName: submissionPayload.fullName,
    mobileNumber: submissionPayload.mobileNumber,
    relationship: submissionPayload.relationship,
    residenceType: submissionPayload.residenceType,
    residingSince: submissionPayload.residingSince,
    landmark: submissionPayload.landmark,
    govtIdType: submissionPayload.govtIdType,
    govtIdPhotos: submissionPayload.govtIdPhotos || [],
    selfiePhoto: submissionPayload.selfiePhoto || null,
    outsideHousePhoto: submissionPayload.outsideHousePhoto || null,
    submittedAt: new Date().toISOString(),
    verificationType: existing.formType || "Digital Address Verification",
    staticMapUrl: staticMapUrl,
    addressCoords: addressCoords,
    gpsLocation: submissionPayload.gpsLocation,
  };

  const safeCandidateName = (pdfData.candidateName || "UnknownCandidate")
    .replace(/[^a-zA-Z0-9\s]/gi, '')
    .replace(/\s+/g, '_');
  const safeFormType = (pdfData.formType || "Report")
    .replace(/[^a-zA-Z0-9]/gi, '_');

  const finalCandidateNamePart = safeCandidateName.toLowerCase() || "candidate";
  const finalFormTypePart = safeFormType.toLowerCase() || "report";
  const filename = `${finalCandidateNamePart}_${finalFormTypePart}.pdf`;

  try {
    const pdfPath = await generatePDFAndSave(pdfData, filename);

    await prisma.formLinks.update({
      where: { token },
      data: {
        status: 'submitted',
        responsePDF: pdfPath,
      }
    });
    return NextResponse.json({ ok: true, message: "Submission successful.", pdfPath });
  } catch (processError) {
    console.error("API POST HANDLER: Error during PDF generation or DB update:", processError);
    const errorMessage = processError instanceof Error ? processError.message : "Unknown processing error.";
    return NextResponse.json({ ok: false, error: `Failed to process submission: ${errorMessage}` }, { status: 500 });
  }
}