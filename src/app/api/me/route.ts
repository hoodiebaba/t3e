import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-strong-secret'
    ) as { userId: string, [key: string]: any };  // <-- number nahi, string!
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },              // <-- number nahi, string!
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        permissions: true
      }
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
  }
}
