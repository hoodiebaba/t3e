// File: src/app/api/profile/update/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.slice(7)
  let userId: string, role: string
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-strong-secret') as any
    userId = payload.userId
    role = payload.role
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })
  }

  const body = await request.json()
  const { oldUsername, updates } = body as {
    oldUsername: string
    updates: {
      username?: string
      email?: string
      phone?: string
      password?: string
      avatar?: string
    }
  }

  // Find user by old username (ensure correct user)
  const user = await prisma.user.findUnique({ where: { username: oldUsername } })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
  }

  // Prepare data for update (merge changes)
  const data: any = {}
  if (updates.username) data.username = updates.username
  if (updates.email) data.email = updates.email
  if (updates.phone !== undefined) data.phone = updates.phone
  if (updates.password) data.password = updates.password
  if (updates.avatar) data.avatar = updates.avatar

  // Update user
  await prisma.user.update({
    where: { id: user.id }, // use user.id for safety
    data
  })

  return NextResponse.json({ ok: true })
}
