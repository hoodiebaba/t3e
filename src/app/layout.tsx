// src/app/layout.tsx
'use client';

import './globals.css';
import { usePathname } from 'next/navigation.js';
import { PropsWithChildren } from 'react';
import Navbar from './components/navbar.tsx';
import Sidebar from './components/sidebar.jsx';
import { UserProvider, useUser } from '@/context/UserContext.tsx';
import './globals.css';

function LayoutBody({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { user, loading } = useUser();

  // === FIX: Show nothing until user/permissions finish loading ===
  if (loading) return null; // Or return a loader if you want

  const showNav = !!user && pathname !== '/';

  return (
    <>
      {showNav && <Navbar />}
      <div
        style={{
          display: showNav ? 'flex' : 'block',
          minHeight: '100vh',
        }}
      >
        {showNav && <Sidebar />}
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </>
  );
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <LayoutBody>{children}</LayoutBody>
        </UserProvider>
      </body>
    </html>
  );
}
