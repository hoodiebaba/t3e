import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePDFAndSave } from '@/lib/pdfUtil'; // Ensure this path is correct
import type { NextRequest } from 'next/server';

// Haversine distance function
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

// GET Handler
export async function GET(
  req: NextRequest, 
  context: { params: { token: string } }
 // Direct destructuring of params from the context-like object
) {
  // console.log("API GET HANDLER: Request received for /api/form-links/[token]");
 const params = await context.params;
const token = params.token;
 // Now token is directly from the destructured params

  if (!token) {
    // console.log("API GET HANDLER: Token is missing in params");
    return NextResponse.json({ ok: false, error: "Token parameter is missing" }, { status: 400 });
  }
  // console.log("API GET HANDLER: Attempting to fetch form with token:", token);

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
        formType: true,     // ✨ Selected for client if needed, and for POST logic consistency
        createdBy: true,    // ✨ Selected for client if needed
      }
    });

    if (!form) {
      // console.log("API GET HANDLER: Form not found for token:", token);
      return NextResponse.json({ ok: false, error: "Form link not found or invalid" }, { status: 404 });
    }
    // console.log("API GET HANDLER: Form found, returning data for token:", token);
    return NextResponse.json({ ok: true, form });
  } catch (error) {
    console.error("API GET HANDLER: Error fetching form data from DB:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ ok: false, error: `Failed to retrieve form data: ${errorMessage}` }, { status: 500 });
  }
}

// POST Handler
export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
const tokenValue = params.token;
  console.log("API POST HANDLER: Request received for /api/form-links/[token]");
  const { token } = context.params;

  const submissionPayload = await req.json();
  // console.log("API POST HANDLER: Received submission payload for token:", token);

  // Fetch existing record, ensuring all fields needed for pdfData (incl. for filename) are selected
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
      formType: true,     // ✨ For filename & PDF
      createdBy: true,    // ✨ For "Requested By" in PDF
      // Select any other fields from 'existing' that pdfData might need
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
  // console.log("API POST HANDLER: CANDIDATE ADDRESS FOR GEOCODE:", candidateAddressString);

  // ✨✨✨ CORRECTED API Key Access HERE ✨✨✨
  const ACTUAL_Maps_API_KEY = process.env.Maps_API_KEY; 
  
  if (!ACTUAL_Maps_API_KEY) {
    console.error("API POST HANDLER ERROR: Maps_API_KEY is not set in environment variables.");
    return NextResponse.json({ ok: false, error: "Server configuration error (missing API key)" }, { status: 500 });
  }
  // console.log("API POST HANDLER: Using Maps_API_KEY.");

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
  // console.log("API POST HANDLER: Geocoded candidate address:", addressCoords);

  if (!submissionPayload.gpsLocation || typeof submissionPayload.gpsLocation.lat !== 'number' || typeof submissionPayload.gpsLocation.lng !== 'number') {
    return NextResponse.json({ ok: false, error: "Valid GPS location from respondent is missing." }, { status: 400 });
  }
  const dist = getDistance(
    addressCoords.lat,
    addressCoords.lng,
    submissionPayload.gpsLocation.lat,
    submissionPayload.gpsLocation.lng
  );
  // console.log(`API POST HANDLER: Distance calculated: ${dist}m`);

  const MAX_ALLOWED_DISTANCE_METERS = process.env.MAX_DISTANCE_METERS ? parseInt(process.env.MAX_DISTANCE_METERS) : 10000; // Increased default
  if (dist > MAX_ALLOWED_DISTANCE_METERS) {
    return NextResponse.json({
      ok: false,
      error: `Your live location is too far from the registered address (${Math.round(dist)}m away). Max allowed: ${MAX_ALLOWED_DISTANCE_METERS}m.`
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
    requestedBy: existing.createdBy, // ✨ For "Requested By" field in PDF
    formType: existing.formType,     // ✨ For PDF filename & display in PDF

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
  
  // ✨ New Filename Logic ✨
  const safeCandidateName = (pdfData.candidateName || "UnknownCandidate")
                            .replace(/[^a-zA-Z0-9\s]/gi, '') // Remove special chars except space
                            .replace(/\s+/g, '_');          // Replace spaces with underscore
  const safeFormType = (pdfData.formType || "Report")
                         .replace(/[^a-zA-Z0-9]/gi, '_'); // Remove special chars

  // Ensure names are not empty after sanitization
  const finalCandidateNamePart = safeCandidateName.toLowerCase() || "candidate";
  const finalFormTypePart = safeFormType.toLowerCase() || "report";
  const filename = `${finalCandidateNamePart}_${finalFormTypePart}.pdf`;
  
  try {
    // console.log("API POST HANDLER: Attempting to generate PDF:", filename);
    // console.log("Data for PDF (keys only):", Object.keys(pdfData));
    const pdfPath = await generatePDFAndSave(pdfData, filename);
    // console.log("API POST HANDLER: PDF generated at:", pdfPath);

    await prisma.formLinks.update({
      where: { token },
      data: {
        status: 'submitted',
        responsePDF: pdfPath,
      }
    });
    // console.log("API POST HANDLER: FormLink record updated in DB for token:", token);
    return NextResponse.json({ ok: true, message: "Submission successful.", pdfPath });
  } catch (processError) {
    console.error("API POST HANDLER: Error during PDF generation or DB update:", processError);
    const errorMessage = processError instanceof Error ? processError.message : "Unknown processing error.";
    return NextResponse.json({ ok: false, error: `Failed to process submission: ${errorMessage}` }, { status: 500 });
  }
}