// File: src/app/api/users/permissions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Type guard for plain object with boolean values only
function isPermObject(val: any): val is Record<string, boolean> {
  return val && typeof val === 'object' && !Array.isArray(val);
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, permissions } = await req.json();
    console.log("[API] Called with userId:", userId, "permissions:", permissions);

    const auth = req.headers.get('authorization');
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      console.log("[API] No token found");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let requester: any;
    try {
      requester = jwt.verify(token, process.env.JWT_SECRET!);
      console.log("[API] Token verified. requester:", requester.username || requester.email || requester);
    } catch (err) {
      console.log("[API] Invalid token");
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    // Only editable permissions allowed
    const myPerms = requester.permissions || {};
    const editablePerms = Object.keys(myPerms).filter(p => myPerms[p]);
    const newPerms: Record<string, boolean> = {};

    editablePerms.forEach(perm => {
      newPerms[perm] = !!permissions[perm];
    });
    console.log("[API] Editable perms:", editablePerms, "New perms object:", newPerms);

    // Fetch existing user permissions to preserve non-editable ones
    const targetUser = await prisma.user.findUnique({
where: { id: userId }
    });

    if (!targetUser) {
      console.log("[API] Target user not found:", userId);
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    let existingPerms: Record<string, boolean> = {};

    // Properly parse and type guard for permissions
    if (isPermObject(targetUser.permissions)) {
      existingPerms = targetUser.permissions as Record<string, boolean>;
    } else if (typeof targetUser.permissions === "string") {
      try {
        const parsed = JSON.parse(targetUser.permissions);
        if (isPermObject(parsed)) existingPerms = parsed;
      } catch {
        existingPerms = {};
      }
    } else {
      existingPerms = {};
    }
    console.log("[API] Existing perms before merge:", existingPerms);

    // Merge editable perms only, preserve rest
    const mergedPerms: Record<string, boolean> = { ...existingPerms, ...newPerms };
    console.log("[API] Merged perms to be saved:", mergedPerms);

    const updatedUser = await prisma.user.update({
where: { id: userId },
      data: { permissions: mergedPerms }
    });

    console.log("[API] Permissions updated successfully for userId:", userId);
    return NextResponse.json({ ok: true, updatedUser });
  } catch (err) {
    console.log("[API] Internal error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
