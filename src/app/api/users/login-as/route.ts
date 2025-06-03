import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Make sure you have process.env.JWT_SECRET in your .env file

export async function POST(req: NextRequest) {
  try {
    const { targetUserId } = await req.json();
    // Auth: Only SUDO user can access
    const auth = req.headers.get('authorization');
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let requester: any;
    try {
      requester = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    if (requester.role !== 'SUDO') {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Fetch target user (except password!)
    const target = await prisma.user.findUnique({
where: { id: targetUserId },
      select: {
        id: true, username: true, email: true, phone: true, role: true, permissions: true,
      }
    });

    if (!target) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    // Create a new token for target user (userId key required!)
    const newToken = jwt.sign(
      {
        userId: target.id,             // <<-- Ye field zaroori hai!
        username: target.username,
        email: target.email,
        phone: target.phone,
        role: target.role,
        permissions: target.permissions,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    return NextResponse.json({ ok: true, token: newToken });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
