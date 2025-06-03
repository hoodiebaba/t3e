'use client';

import styles from './404.module.css';
import { MdErrorOutline } from 'react-icons/md';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <MdErrorOutline className={styles.icon} />
      </div>
      <h1 className={styles.heading}>404</h1>
      <h2 className={styles.subheading}>Page Not Found</h2>
      <p className={styles.text}>
        Oops! The page you are looking for does not exist.<br />
        Please check the URL or return to the homepage.
      </p>
      <a href="/" className={styles.homeBtn}>Go to Home</a>
    </div>
  );
}
