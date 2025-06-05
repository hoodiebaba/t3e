// src/app/bgv/components/Step1_ContactInfo.js
import React from 'react';
import styles from '../bgv-form.module.css'; // Use the common CSS module

export default function Step1_ContactInfo({ formData, updateFormData, onNext, onSaveDraft, isSubmitting }) {
  
  const handleMobileInputChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 10) {
      updateFormData(null, name, numericValue);
    }
  };

  const handleChange = (e) => {
    updateFormData(null, e.target.name, e.target.value);
  };

  const handleNextClick = () => {
    if (!formData.email || !formData.mobile) {
      alert("Email and Mobile Number are required.");
      return;
    }
    if (formData.mobile && formData.mobile.length !== 10) {
      alert("Mobile number must be 10 digits.");
      return;
    }
    if (formData.alternateMobile && formData.alternateMobile.length > 0 && formData.alternateMobile.length !== 10) {
      // Only validate length if alternateMobile is not empty
      alert("Alternate mobile number must be 10 digits if provided.");
      return;
    }
    onSaveDraft(); 
    onNext();
  };

  return (
    <div className={styles.formStep}>
      <h2 className={styles.stepTitle}>Contact Information</h2>
      
      <div className={styles.formField}>
        <label htmlFor="email" className={styles.label}>
          Email ID <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className={styles.input}
          value={formData.email || ''}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="mobile" className={styles.label}>
          Mobile Number <span className={styles.requiredAsterisk}>*</span>
        </label>
        <div className={styles.inputGroup}>
          <span className={styles.inputGroupText}>+91</span>
          <input
            type="tel"
            id="mobile"
            name="mobile"
            className={styles.input}
            value={formData.mobile || ''}
            onChange={handleMobileInputChange}
            placeholder="10 digit mobile number"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor="alternateMobile" className={styles.label}>
          Alternate Mobile
        </label>
        <div className={styles.inputGroup}>
          <span className={styles.inputGroupText}>+91</span>
          <input
            type="tel"
            id="alternateMobile"
            name="alternateMobile"
            className={styles.input}
            value={formData.alternateMobile || ''}
            onChange={handleMobileInputChange}
            placeholder="10 digit mobile number"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={onSaveDraft}
          className={styles.buttonSecondary}
          disabled={isSubmitting || !formData.email || !formData.mobile || (formData.mobile && formData.mobile.length !== 10)}
        >
          {isSubmitting ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={handleNextClick}
          className={styles.buttonPrimary}
          disabled={isSubmitting || !formData.email || !formData.mobile || (formData.mobile && formData.mobile.length !== 10)}
        >
          {isSubmitting ? 'Processing...' : 'Next'}
        </button>
      </div>
    </div>
  );
}