import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// --- GET: List all users ---
export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, email: true, phone: true,
      createdBy: true, createdAt: true, role: true, permissions: true,
    }
  });
  return NextResponse.json({ users });
}

// --- POST: Create user ---
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { username, email, phone, password, role, permissions, createdBy } = data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }, { phone }] }
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Username, email, or phone already exists." }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username, email, phone, password: hashed,
        role, permissions, createdBy,
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// --- DELETE: Remove users by IDs ---
export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ ok: false, error: "No users selected." }, { status: 400 });
    }
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
