"use client";
import styles from './thanks.module.css';

export default function ThankYouPage() {
  return (
    <div className={styles.bg}>
      <div className={styles.card}>
        <svg
          className={styles.tick}
          viewBox="0 0 52 52"
        >
          <circle className={styles.circleGreen} cx="26" cy="26" r="25" />
          <path className={styles.checkGreen} fill="none" d="M16 27 l8 8 l13 -15"/>
        </svg>
        <h2>Thank You!</h2>
        <p>
          Your response has been submitted<br/>
          successfully.<br/>
          We appreciate your time!
        </p>
      </div>
    </div>
  );
}
