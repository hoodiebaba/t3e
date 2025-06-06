import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation.js';
import styles from './navbar.module.css';
import { Bell, Settings } from 'lucide-react';
import { useUser } from '@/context/UserContext.tsx';

export default function Navbar() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [avatar, setAvatar] = useState<string>('/assets/default-profile.png');

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      setAvatar('/assets/default-profile.png');
      return;
    }
    fetch(`/api/profile/avatar?id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.avatar) setAvatar(data.avatar);
        else setAvatar('/assets/default-profile.png');
      });
  }, [user?.id, loading]); // <<--- dependency array is always length 2

  const goHome = () => router.push('/dashboard');
  const goProfile = () => router.push('/profile');

  if (loading) {
    return (
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <img src="/assets/logo.png" alt="Logo" className={styles.logo} />
          <span className={styles.companyName}>Trinetra III Eye Private Ltd.</span>
        </div>
        <div className={styles.topbarRight}>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.topbar}>
      <div className={styles.topbarLeft} onClick={goHome}>
        <img src="/assets/logo.png" alt="Logo" className={styles.logo} />
        <span className={styles.companyName}>Trinetra III Eye Private Ltd.</span>
      </div>
      <div className={styles.topbarRight}>
        <Bell className={styles.icon} />
        <Settings className={styles.icon} />
        <span className={styles.profileName} onClick={goProfile}>
          {user.username || (user.role === 'SUDO' ? 'Super Admin' : 'User')}
        </span>
        <img
          src={avatar}
          alt="Profile"
          className={styles.profileIcon}
          onClick={goProfile}
        />
      </div>
    </div>
  );
}
