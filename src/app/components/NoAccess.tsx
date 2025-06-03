'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './NoAccess.module.css'; // optional, style ka path change kar lo

export default function NoAccess({ message }: { message?: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard'); // 2 sec baad dashboard pe redirect
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={styles.noAccessWrap}>
      <div className={styles.noAccessCard}>
        <span role="img" aria-label="warning" className={styles.noAccessIcon}>🚫</span>
        <h2>No Access</h2>
        <p>{message || 'You do not have access to this page.'}</p>
        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
          Redirecting to dashboard...
        </p>
      </div>
    </div>
  );
}
