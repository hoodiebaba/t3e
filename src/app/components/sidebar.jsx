'use client';
import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FaHome } from 'react-icons/fa';
import { FiFileText, FiBarChart2, FiUsers } from 'react-icons/fi';
import { RiLayoutMasonryFill } from 'react-icons/ri';
import styles from './sidebar.module.css';
import { useUser } from '@/context/UserContext';

const menuItems = [
  { label: 'Dashboard', icon: <FaHome />, path: '/dashboard', permission: 'viewDashboard' },
  { label: 'Forms', icon: <FiFileText />, path: '/forms', permission: 'createFormAVF' },
  { label: 'Responses', icon: <FiBarChart2 />, path: '/responses', permission: 'viewResponses' },
  { label: 'Users', icon: <FiUsers />, path: '/users', permission: 'createUser' },
];

export default function Sidebar() {
  const { user, loading } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [popup, setPopup] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  if (loading || !user) return null;

  // JS only - no types!
  const hasPermission = (perm) =>
    user?.role === 'SUDO' || (user?.permissions && user.permissions[perm]);

  const handleItemClick = (item) => {
    if (hasPermission(item.permission)) {
      router.push(item.path);
    } else {
      setPopup(item.label);
      setTimeout(() => setPopup(''), 1800);
    }
  };

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <div className={`${styles.sidebarWrapper} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        {!collapsed && <h2 className={styles.sidebarTitle}>{user?.role === 'SUDO' ? 'Super Admin' : 'Administrator'}</h2>}
        <div className={`${styles.toggleBtn} ${collapsed ? styles.active : ''}`} onClick={toggleSidebar}>
          <RiLayoutMasonryFill />
        </div>
      </div>
      <ul className={styles.sidebarList}>
        {menuItems.map((item) => (
          <li
            key={item.label}
            className={`${styles.sidebarItem} ${
              pathname === item.path || (item.path === '/' && pathname === '/') ? styles.active : ''
            }`}
            onClick={() => handleItemClick(item)}
            style={{ pointerEvents: 'auto', opacity: 1 }}
          >
            <span className={styles.sidebarIcon}>{item.icon}</span>
            {!collapsed && <span className={styles.sidebarText}>{item.label}</span>}
          </li>
        ))}
      </ul>
      {popup && (
        <div className={styles.permissionPopup}>
          You don&apos;t have permission to access &quot;{popup}&quot;.
        </div>
      )}
    </div>
  );
}
