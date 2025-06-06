'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation.js';
import LoginPage from './components/login.tsx';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');   // Agar login hai to dashboard pe bhej do
    }
    // Agar login nahi hai to niche LoginPage dikhega
  }, []);

  // Jab tak login nahi, LoginPage dikhao
  return <LoginPage onLoginSuccess={() => router.replace('/dashboard')} />;
}
