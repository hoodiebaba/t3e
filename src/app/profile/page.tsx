'use client';

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useState } from 'react';
import styles from './profile.module.css';
import { MdEdit } from 'react-icons/md';
import { useUser } from '@/context/UserContext';
import NoAccess from '../components/NoAccess';

const DEFAULT_PROFILE_PIC = '/assets/default-profile.png';

export default function ProfilePage() {
  useAuthGuard();

  const { user, refreshUser } = useUser();
  const perms = user?.permissions || {};
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    avatar: user?.avatar || DEFAULT_PROFILE_PIC
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 1. ACCESS CONTROL (Only permission based, NO user.role check)
  if (!perms.viewProfile) {
    return <NoAccess message="You do not have access to this page." />;
  }

  // Avatar Upload (only if permission)
  const handleImage = (e) => {
    if (!perms.editProfilePic) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(f => ({ ...f, avatar: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  // Handle field change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Save profile (all fields as it is)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          oldUsername: user.username,
          updates: {
            username: form.username,
            email: form.email,
            phone: form.phone,
            password: form.password,
            avatar: form.avatar
          }
        })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Profile updated!');
        refreshUser();
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error');
    }
    setSaving(false);
  };

  // Logout logic
  const handleLogout = () => {
    localStorage.removeItem('token');
    refreshUser();
    window.location.href = '/';
  };

  // Loading
  if (!user) return <div>Loading your profile…</div>;

  return (
    <div className={styles.pageBg}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Your Profile</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={saving}
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="group flex items-center justify-start w-11 h-11 bg-red-600 rounded-full cursor-pointer relative overflow-hidden transition-all duration-200 shadow-lg hover:w-32 hover:rounded-lg active:translate-x-1 active:translate-y-1"
            onClick={handleLogout}
            type="button"
            title="Logout"
          >
            <div className="flex items-center justify-center w-full transition-all duration-300 group-hover:justify-start group-hover:px-3">
              <svg className="w-4 h-4" viewBox="0 0 512 512" fill="white">
                <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
              </svg>
            </div>
            <div className="absolute right-5 transform translate-x-full opacity-0 text-white text-lg font-semibold transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
              Logout
            </div>
          </button>
        </div>
      </div>

      {/* Avatar */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarWrapper}>
          <img
            src={form.avatar || DEFAULT_PROFILE_PIC}
            alt="Profile"
            className={styles.avatar}
          />
          {perms.editProfilePic && (
            <label htmlFor="avatarUpload" className={styles.avatarEditBtn} title="Edit profile photo">
              <MdEdit size={20} color="#c1121f" />
              <input
                id="avatarUpload"
                type="file"
                accept="image/*"
                onChange={handleImage}
                className={styles.avatarInput}
                tabIndex={-1}
              />
            </label>
          )}
        </div>
      </div>

      {/* Profile Fields */}
      <form onSubmit={handleSave} className={styles.form}>
        {/* Username */}
        <div className={styles.row}>
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            className={styles.input}
            autoComplete="off"
            readOnly={!perms.editUsername}
          />
        </div>
        {/* Email */}
        <div className={styles.row}>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className={styles.input}
            autoComplete="off"
            readOnly={!perms.editMailID}
          />
        </div>
        {/* Phone */}
        <div className={styles.row}>
          <label htmlFor="phone">Phone:</label>
          <input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className={styles.input}
            autoComplete="off"
            readOnly={!perms.editNumber}
          />
        </div>
        {/* Password always editable */}
        <div className={styles.row}>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className={styles.input}
            placeholder="New password (optional)"
            autoComplete="off"
          />
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  );
}
