'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from './navbar';
import Sidebar from './sidebar';
import { useUser } from '@/context/UserContext';

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    // Agar user context me nahi hai, toh login pe bhej do
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null; // Jab tak context ready nahi, kuch mat dikhao

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <sidebar />
        <main style={{ flex: 1, padding: '24px', background: '#f6f6f6' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
