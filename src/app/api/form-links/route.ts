import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Token generator: random 10-char alphanumeric
function generateToken(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// GET all form links
export async function GET(req: NextRequest) {
  try {
    const links = await prisma.formLinks.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ links });
  } catch (err) {
    console.error("GET /api/form-links error:", err);
    return NextResponse.json({ links: [], error: 'DB error' }, { status: 500 });
  }
}

// POST: Create new link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("POST /api/form-links body:", body); // <-- Debug input

    const {
      formType, createdBy, candidateName, houseNo, nearby, area, zipCode, city, state, country
    } = body;

    // DEBUG: Missing required field check
    if (!formType || !createdBy) {
      console.error("Missing required field(s):", { formType, createdBy });
      return NextResponse.json({ ok: false, error: 'formType and createdBy are required.' }, { status: 400 });
    }

    // Random 10-char token (like "a93kZ18QzB")
    const token = generateToken(10);

    const newLink = await prisma.formLinks.create({
      data: {
        token,
        formType,
        createdBy,
        status: 'not_clicked',
        candidateName: candidateName || null,
        houseNo: houseNo || null,
        nearby: nearby || null,
        area: area || null,
        zipCode: zipCode || null,
        city: city || null,
        state: state || null,
        country: country || 'India'
      }
    });

    return NextResponse.json({ ok: true, link: newLink });
  } catch (err) {
    console.error("POST /api/form-links ERROR:", err); // <-- Yeh line terminal me real error print karegi
    return NextResponse.json({ ok: false, error: 'Create failed', detail: String(err) }, { status: 500 });
  }
}

// DELETE: Bulk delete
export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    await prisma.formLinks.deleteMany({
      where: { id: { in: ids } }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/form-links ERROR:", err); // <-- Debug
    return NextResponse.json({ ok: false, error: 'Delete failed' }, { status: 500 });
  }
}
