// src/app/bgv/components/Step2_PersonalDetails.js
import React, { useState, useEffect } from 'react';
import styles from '../bgv-form.module.css';

export default function Step2_PersonalDetails({ formData, updateFormData, onNext, onPrevious, onSaveDraft, isSubmitting }) {
  // Initialize personalDetails in formData if not present
  const personalData = formData.personalDetails || {};

  const [photoPreview, setPhotoPreview] = useState(personalData.passportPhotoPreview || null);

  useEffect(() => {
    // If a photo was previously selected and its preview URL stored in formData
    if (formData.personalDetails?.passportPhoto?.previewUrl) {
      setPhotoPreview(formData.personalDetails.passportPhoto.previewUrl);
    }
  }, [formData.personalDetails?.passportPhoto?.previewUrl]);


  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (name === "passportPhoto") {
      if (files && files[0]) {
        const file = files[0];
        const previewUrl = URL.createObjectURL(file);
        setPhotoPreview(previewUrl);
        // Store file info; actual file object needs to be handled for upload later
        updateFormData('personalDetails', 'passportPhoto', {
          file: file, // Keep the file object for upload
          fileName: file.name,
          fileType: file.type,
          previewUrl: previewUrl // For immediate preview
        });
      } else {
        // If file selection is cancelled or no file
        setPhotoPreview(null);
        updateFormData('personalDetails', 'passportPhoto', null);
      }
    } else if (name === "email" || name === "mobile") {
        // Update top-level email/mobile if edited in this step
        updateFormData(null, name, value);
    }
    else {
      updateFormData('personalDetails', name, value);
    }
  };
  
  const handleFullNameChange = (e) => {
    let value = e.target.value;
    // Basic capitalization of first letter of each word for display, can be improved
    // CSS text-transform: capitalize is also an option for display only
    // value = value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    updateFormData('personalDetails', 'fullName', value);
  };


  const handleNextClick = () => {
    // Add validation for required fields in Step 2
    if (!personalData.fullName || !personalData.fatherName || !formData.email || !formData.mobile || !personalData.dob || !personalData.gender || !personalData.nationality) {
      alert("Please fill all required personal details: Full Name, Father's Name, Email, Mobile, DOB, Gender, Nationality.");
      return;
    }
    // Further specific validations can be added here
    onSaveDraft(); // Save draft before proceeding
    onNext();
  };

  const genderOptions = ["Male", "Female", "Other"];
  const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed", "Separated"];


  return (
    <div className={styles.formStep}>
      <h2 className={styles.stepTitle}>Personal Details</h2>

      {/* Full Name */}
      <div className={styles.formField}>
        <label htmlFor="fullName" className={styles.label}>
          Full Name <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          className={`${styles.input} ${styles.capitalizeInput}`} // Added capitalizeInput class
          value={personalData.fullName || ''}
          onChange={handleFullNameChange}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Former Name */}
      <div className={styles.formField}>
        <label htmlFor="formerName" className={styles.label}>Former Name (if any)</label>
        <input
          type="text"
          id="formerName"
          name="formerName"
          className={styles.input}
          value={personalData.formerName || ''}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>

      {/* Father's Name */}
      <div className={styles.formField}>
        <label htmlFor="fatherName" className={styles.label}>
          Father's Name <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          type="text"
          id="fatherName"
          name="fatherName"
          className={styles.input}
          value={personalData.fatherName || ''}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Spouse's Name */}
      <div className={styles.formField}>
        <label htmlFor="spouseName" className={styles.label}>Spouse's Name (if applicable)</label>
        <input
          type="text"
          id="spouseName"
          name="spouseName"
          className={styles.input}
          value={personalData.spouseName || ''}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      
      {/* Email ID (Autofill from Step 1, editable) */}
      <div className={styles.formField}>
        <label htmlFor="email_personal" className={styles.label}>
            Email ID <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
            type="email"
            id="email_personal" // Different ID to avoid conflict if Step 1 email is still in DOM
            name="email" // Keep name 'email' to update the top-level formData.email
            className={styles.input}
            value={formData.email || ''} // Use top-level email from formData
            onChange={handleChange}
            required
            disabled={isSubmitting}
        />
      </div>

      {/* Mobile No (Autofill from Step 1, editable) */}
      <div className={styles.formField}>
        <label htmlFor="mobile_personal" className={styles.label}>
            Mobile No <span className={styles.requiredAsterisk}>*</span>
        </label>
        <div className={styles.inputGroup}>
            <span className={styles.inputGroupText}>+91</span>
            <input
                type="tel"
                id="mobile_personal" // Different ID
                name="mobile" // Keep name 'mobile' to update top-level formData.mobile
                className={styles.input}
                value={formData.mobile || ''} // Use top-level mobile from formData
                onChange={(e) => { // Simplified mobile input handler for this step
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue.length <= 10) {
                        updateFormData(null, 'mobile', numericValue);
                    }
                }}
                placeholder="10 digit mobile number"
                required
                disabled={isSubmitting}
            />
        </div>
      </div>


      {/* Date of Birth */}
      <div className={styles.formField}>
        <label htmlFor="dob" className={styles.label}>
          Date of Birth <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          type="date"
          id="dob"
          name="dob"
          className={styles.input}
          value={personalData.dob || ''}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          max={new Date().toISOString().split("T")[0]} // Prevent future dates
        />
      </div>

      {/* Gender */}
      <div className={styles.formField}>
        <label htmlFor="gender" className={styles.label}>
          Gender <span className={styles.requiredAsterisk}>*</span>
        </label>
        <select
          id="gender"
          name="gender"
          className={styles.select} // Use .select style from CSS
          value={personalData.gender || ''}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        >
          <option value="" disabled>Select Gender</option>
          {genderOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Nationality */}
      <div className={styles.formField}>
        <label htmlFor="nationality" className={styles.label}>
          Nationality <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          type="text"
          id="nationality"
          name="nationality"
          className={styles.input}
          value={personalData.nationality || 'Indian'} // Default to Indian
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Marital Status */}
      <div className={styles.formField}>
        <label htmlFor="maritalStatus" className={styles.label}>Marital Status</label>
        <select
          id="maritalStatus"
          name="maritalStatus"
          className={styles.select}
          value={personalData.maritalStatus || ''}
          onChange={handleChange}
          disabled={isSubmitting}
        >
          <option value="">Select Marital Status (Optional)</option>
           {maritalStatusOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Passport Size Photo */}
      <div className={styles.formField}>
        <label htmlFor="passportPhoto" className={styles.label}>Passport Size Photo</label>
        <input
          type="file"
          id="passportPhoto"
          name="passportPhoto"
          className={styles.inputFile} // You might need a new class for file inputs
          accept="image/jpeg, image/png, image/jpg"
          onChange={handleChange}
          disabled={isSubmitting}
        />
        {photoPreview && (
          <div className={styles.imagePreviewContainer}>
            <img src={photoPreview} alt="Photo Preview" className={styles.imagePreview} />
          </div>
        )}
      </div>

      <div className={styles.buttonGroup}>
        <button type="button" onClick={onPrevious} className={styles.buttonSecondary} disabled={isSubmitting}>
          Previous
        </button>
        <button type="button" onClick={onSaveDraft} className={styles.buttonSecondary} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save as Draft'}
        </button>
        <button type="button" onClick={handleNextClick} className={styles.buttonPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Next'}
        </button>
      </div>
    </div>
  );
}