// File: src/app/api/auth/request-otp/route.ts
import { NextResponse } from 'next/server.js';
import { prisma } from '@/lib/prisma'; // For NodeNext, if extension required
import nodemailer from 'nodemailer';
import { generateOTP } from '../../../../utils/otp';
import bcrypt from 'bcryptjs'; // 🔥 Add this on top

// 1️⃣ Configure your mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request: Request) {
  try {
    // 2️⃣ Grab and normalize inputs
    const { username, email, password, role, phone } = await request.json();
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { ok: false, error: 'Username, email, password and role are incorrect or required.' },
        { status: 400 }
      );
    }
    const inputEmail = email.trim().toLowerCase();

    // 3️⃣ Find by username (unique)
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
    }

    // 4️⃣ Verify email
    if (user.email.toLowerCase() !== inputEmail) {
      return NextResponse.json({ ok: false, error: 'Email does not match username.' }, { status: 401 });
    }

    // 5️⃣ Verify password (case-sensitive)
    const passwordValid = await bcrypt.compare(password, user.password);
if (!passwordValid) {
  return NextResponse.json({ ok: false, error: 'Invalid password.' }, { status: 401 });
}
    // 6️⃣ Verify role
    if (user.role !== role) {
      return NextResponse.json({ ok: false, error: 'Role mismatch.' }, { status: 401 });
    }

    // 7️⃣ If SUDO, also verify phone
    if (role === 'SUDO') {
      if (!phone || user.phone !== phone.trim()) {
        return NextResponse.json(
          { ok: false, error: 'Invalid phone number for SUDO.' },
          { status: 401 }
        );
      }
    }

    // 8️⃣ All good → Generate OTP & expiry
    const code = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { otpToken: code, otpExpiry: expiry },
    });

    // 9️⃣ Send OTP by email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your Trinetra OTP Code',
      text: `Your OTP code is ${code}. It expires in 5 minutes.`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('request-otp error', err);
    return NextResponse.json(
      { ok: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
