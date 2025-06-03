'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import styles from './avf-response.module.css';
import styles from './global.module.css';
export default function AVFResponsePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('id');
  const router = useRouter();

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(true);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [location, setLocation] = useState(null);
  const [reloaded, setReloaded] = useState(false);
  const [step, setStep] = useState(1);
  const [showReloadedWarning, setShowReloadedWarning] = useState(true);

  // Mobile only logic - commented out for now
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     const ua = navigator.userAgent;
  //     const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(ua);
  //     setIsMobile(mobile);
  //     setShowMobileWarning(!mobile);
  //   }
  // }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.performance) {
      if (performance.navigation.type === 1) {
        setReloaded(true);
        setShowReloadedWarning(true);
        setTimeout(() => setShowReloadedWarning(false), 2000);
      }
    }
  }, []);

  useEffect(() => {
    if (isMobile && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        err => setLocation(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [isMobile]);

  useEffect(() => {
    if (!token) return;
    async function fetchData() {
      const res = await fetch(`/api/form-links/${token}`);
      const data = await res.json();
      if (data.ok && data.form) {
        setFormData(data.form);
        setLoading(false);
        if (data.form.status === "submitted") {
          setTimeout(() => {
            router.replace('/thanks');
          }, 1200);
        }
      } else {
        notFound();
      }
    }
    fetchData();
  }, [token]);

  if (!token) notFound();
  if (loading) return <div className={styles.loadingText}>Loading...</div>;

  if (reloaded && showReloadedWarning) {
    return (
      <div className={styles.reloadOuter}>
        <div className={styles.reloadWarning}>
          <h3 className={styles.reloadTitle}>
            If you refresh page you need to refill data again.
          </h3>
          <div className={styles.reloadMsg}>
            No draft is saved in your browser.
          </div>
        </div>
      </div>
    );
  }

  if (formData?.status === "submitted" || submitted) {
    return (
      <div className={styles.submittedMsg}>
        Thank you, {formData?.candidateName || "User"}! <br />
        <span className={styles.submittedMsgSub}>Your response has been submitted.</span>
      </div>
    );
  }

  const addressString = [
    formData.houseNo,
    formData.nearby,
    formData.area,
    formData.city,
    formData.state,
    formData.zipCode,
    formData.country
  ].filter(Boolean).join(", ");
console.log("ADDRESS SENT TO GEOCODE:", addressString);

  return (
    <div className={styles.bgPage}>
      {step === 1 && (
  <div className={styles.mainCard}>
  <div className={styles.imageHolder}>
    <img
      src="/assets/verify-bg.jpg"
      alt="Address Verification"
      className={styles.originalImage}
      draggable={false}
    />
      
    </div>

    {/* SEPARATE INFO CARD */}
      <div className={styles.infoCard}>
        <div className={styles.label}>Candidate</div>
        <div className={styles.value}>{formData.candidateName}</div>
        <div className={styles.label}>Address</div>
        <div className={styles.valueAddress}>{addressString}</div>
      </div>

      {/* CONFIRM CARD */}
      <div className={styles.confirmCard}>
        <div className={styles.confirmTitle}>Are you at the above address?</div>
        <div className={styles.confirmMsg}>
          Proceed <b>ONLY</b> if you are at your home, else the verification may FAIL.
        </div>
        <button
          className={styles.confirmBtn}
          onClick={() => setStep(2)}
        >
          Yes, I'm home. Let's proceed
        </button>
      </div>
    </div>
  )}


      {/* Step 2: Plain bg, no image, no blue card, white card center */}
      {step === 2 && (
        <div className={styles.bgStep2}>
          <div className={styles.step2Card}>
            <div className={styles.step2Title}>Personal Details</div>
            <form
  className={styles.step2Form}
  onSubmit={async (e) => {
    e.preventDefault();
    setError('');
    if (!response.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!location) {
      setError('Location permission is required');
      return;
    }
    const res = await fetch(`/api/form-links/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, gpsLocation: location }),  // <-- yahan gps bhi bhejo
    });
    const data = await res.json();
    if (data.ok) {
      setSubmitted(true);
      setTimeout(() => {
        router.replace('/thanks');
      }, 1200);
    } else if (res.status === 404) {
      notFound();
    } else {
      setError(data.error || 'Submission failed');
    }
  }}
>
  <label className={styles.inputLabel}>Your Full Name</label>
  <input
    type="text"
    value={response}
    onChange={e => setResponse(e.target.value)}
    placeholder="Enter your full name..."
    disabled={submitted}
    className={styles.inputField}
  />
  {!location && <div style={{color:'red'}}>Please allow GPS location</div>}
  {error && <div className={styles.inputError}>{error}</div>}
  <button
    type="submit"
    disabled={submitted || !location}
    className={styles.submitBtn}
  >
    Submit
  </button>
</form>

          </div>
        </div>
      )}
    </div>
  );
}
