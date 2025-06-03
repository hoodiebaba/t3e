// File: src/app/api/profile/request-otp/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { generateOTP } from '@/utils/otp'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

export async function POST(request: Request) {
  // 1) authenticate
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.slice(7)
  let userId: string;  // <-- string type
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-strong-secret') as any
    userId = payload.userId  // <-- string id
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })
  }

  // 2) lookup user
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
  }

  // 3) generate & store OTP
  const code = generateOTP()
  const expiry = new Date(Date.now() + 5 * 60 * 1000)
  await prisma.user.update({
    where: { id: userId },
    data: { otpToken: code, otpExpiry: expiry }
  })

  // 4) send email
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Your Profile-Update OTP',
    text: `Your OTP code is ${code}. It expires in 5 minutes.`
  })

  return NextResponse.json({ ok: true })
}
