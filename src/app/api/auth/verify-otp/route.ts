// File: src/app/api/auth/verify-otp/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  // 1️⃣ Pull in everything we need
  const {
    email,
    code,
    latitude,
    longitude,
    deviceInfo // { userAgent: string }
  } = await request.json();

  if (!email || !code) {
    return NextResponse.json(
      { ok: false, error: 'Email and OTP code are required' },
      { status: 400 }
    );
  }

  // 2️⃣ Locate user & validate OTP
  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    user.otpToken !== code ||
    !user.otpExpiry ||
    user.otpExpiry < new Date()
  ) {
    return NextResponse.json(
      { ok: false, error: 'Invalid or expired OTP' },
      { status: 401 }
    );
  }

  // 3️⃣ Prepare new device & log entries
  const now = new Date();
 const existingDevices = (user.devices as any[]) ?? [];
const existingLogs = (user.logs as any[]) ?? [];


  const deviceEntry = {
    ...deviceInfo,
    latitude:  latitude  ?? null,
    longitude: longitude ?? null,
    at:        now
  };

  const logEntry = {
    action:    'login',
    at:        now,
    latitude:  latitude  ?? null,
    longitude: longitude ?? null
  };

  // 4️⃣ Persist: clear OTP, append devices & logs
  await prisma.user.update({
    where: { email },
    data: {
      otpToken:  null,
      otpExpiry: null,
      devices:   [...existingDevices, deviceEntry],
      logs:      [...existingLogs,    logEntry]
    }
  });

  const token = jwt.sign(
  {
    userId: user.id,
    role: user.role,
    email: user.email,
    permissions: user.permissions || {}
  },
  process.env.JWT_SECRET || 'your-strong-secret',
  { expiresIn: '1d' }
);


  // 6️⃣ Return success + JWT + minimal user info
  return NextResponse.json({
  ok: true,
  token,
  user: {
    id: user.id,
    role: user.role,
    email: user.email,
    permissions: user.permissions || {}
  }
});
}