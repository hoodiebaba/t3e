import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import fs from "fs/promises";
import path from "path";

// AUTH HELPER: Replace this with real session/JWT extraction logic.
async function getCurrentUser(req) {
  // -- Example for NextAuth JWT (if you use it): --
  // import { getToken } from "next-auth/jwt";
  // const token = await getToken({ req, secret: process.env.JWT_SECRET });
  // if (!token) return null;
  // return { username: token.username, createdUsers: token.createdUsers || [] };

  // -- Example for custom JWT cookie --
  // const cookie = req.cookies['your_token_cookie'];
  // const user = decodeYourJWT(cookie);

  // --- DEMO fallback: use username from header for local testing ---
  const username = req.headers.get('x-username') || ''; // Use a custom header for local testing
  if (!username) return null;
  // Optionally fetch created users from DB, here mocked:
  // const user = await prisma.user.findUnique({ where: { username }, select: { username: true, createdUsers: true }});
  return {
    username,
    role: 'admin',
    createdUsers: [], // add sub-user logic if you have it, else empty
  };
}

// Helper: list of allowed usernames (self + createdUsers)
function getAllowedUsers(user) {
  return [user.username, ...(user.createdUsers || [])];
}

// ---- GET Handler ----
export async function GET(req) {
  const user = await getCurrentUser(req); // IMPORTANT: Await karo!
  if (!user) {
    return NextResponse.json({ responses: [] }, { status: 401 });
  }
  const allowedUsers = getAllowedUsers(user);

  // AVF: All submitted forms created by allowed users
  const avf = await prisma.formLinks.findMany({
    where: {
      createdBy: { in: allowedUsers },
      status: "submitted",
      responsePDF: { not: null }
    },
    select: {
      id: true,
      candidateName: true,
      createdBy: true,
      formType: true,
      responsePDF: true,
      createdAt: true,
    }
  });

  // BGV: All submitted BGV forms, need to check createdBy via FormLinks
  const bgv = await prisma.backgroundVerificationForm.findMany({
    where: { status: "submitted", responsePDFUrl: { not: null } },
    select: {
      id: true,
      formLinkToken: true,
      responsePDFUrl: true,
      submittedAt: true,
    }
  });

  // Get all tokens, fetch createdBy for those tokens from FormLinks
  const linkTokens = bgv.map(b => b.formLinkToken);
  const linkData = linkTokens.length > 0
    ? await prisma.formLinks.findMany({
        where: { token: { in: linkTokens } },
        select: { token: true, createdBy: true, candidateName: true, formType: true }
      })
    : [];
  const linkMap = Object.fromEntries(linkData.map(l => [l.token, l]));

  const bgvMapped = bgv.map(item => {
    const link = linkMap[item.formLinkToken];
    if (!link || !allowedUsers.includes(link.createdBy)) return null;
    return {
      id: item.id,
      fileName: item.responsePDFUrl?.split('/').pop() || "BGV.pdf",
      fileUrl: item.responsePDFUrl,
      formType: "bgv",
      createdBy: link.createdBy,
      createdAt: item.submittedAt,
      candidateName: link.candidateName,
    }
  }).filter(Boolean);

  const avfMapped = avf.map(item => ({
    id: item.id,
    fileName: item.responsePDF?.split('/').pop() || "AVF.pdf",
    fileUrl: item.responsePDF,
    formType: item.formType?.toLowerCase() || "avf",
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    candidateName: item.candidateName,
  }));

  return NextResponse.json({ responses: [...avfMapped, ...bgvMapped] });
}

// ---- DELETE Handler ----
export async function DELETE(req) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowedUsers = getAllowedUsers(user);
  const { ids } = await req.json();

  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

  // Delete AVF responses
  const avfToDelete = await prisma.formLinks.findMany({
    where: { id: { in: ids }, createdBy: { in: allowedUsers }, responsePDF: { not: null } }
  });
  for (const item of avfToDelete) {
    if (item.responsePDF) {
      try {
        const pdfPath = path.join(process.cwd(), "public", item.responsePDF);
        await fs.unlink(pdfPath);
      } catch (e) { /* ignore file not found */ }
    }
    await prisma.formLinks.delete({ where: { id: item.id } });
  }

  // Delete BGV responses
  const bgvToDelete = await prisma.backgroundVerificationForm.findMany({
    where: { id: { in: ids }, responsePDFUrl: { not: null } }
  });
  for (const item of bgvToDelete) {
    // Check createdBy from FormLinks (again, for security)
    const link = await prisma.formLinks.findUnique({ where: { token: item.formLinkToken }, select: { createdBy: true } });
    if (!link || !allowedUsers.includes(link.createdBy)) continue;
    if (item.responsePDFUrl) {
      try {
        const pdfPath = path.join(process.cwd(), "public", item.responsePDFUrl);
        await fs.unlink(pdfPath);
      } catch (e) {}
    }
    await prisma.backgroundVerificationForm.delete({ where: { id: item.id } });
  }

  return NextResponse.json({ ok: true, deleted: ids });
}
