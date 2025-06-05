// src/app/bgv/components/Step3_AddressVerification.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import styles from '../bgv-form.module.css'; // Common CSS module

// Helper arrays (can be moved to a constants file later)
const currentYear = new Date().getFullYear();
const years: number[] = Array.from({ length: 70 }, (_, i) => currentYear - i);
const months: { value: string; label: string }[] = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' }, { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' }, { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }
];
const documentTypes: string[] = [
  "Aadhar Card", "Voter ID", "Driving License", "Passport", "Electricity Bill",
  "Telephone Bill", "Rent Agreement", "Bank Statement", "Reference Letter"
];

// --- TypeScript Interfaces for Address Data ---
interface Address {
  houseNo?: string;
  streetArea?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
}

interface Tenure {
  fromMonth?: string;
  fromYear?: string;
  toMonth?: string;
  toYear?: string;
  isPresent?: boolean;
}

export interface UploadedDocument {
  documentType?: string;
  file?: File | null;
  fileName?: string;
  fileType?: string;
  previewUrl?: string | null; // URL for image previews
}

export interface AddressVerificationData {
  currentAddress?: Address;
  currentTenure?: Tenure;
  isPermanentSameAsCurrent?: boolean;
  permanentAddress?: Address;
  permanentTenure?: Tenure;
  uploadedDocuments?: UploadedDocument[];
}

interface Step3Props {
  formData: {
    addressVerification?: AddressVerificationData;
    // Include other parts of formData if needed, or use a more generic type
    [key: string]: any; // Looser typing for other formData parts for now
  };
  updateFormData: (section: string, field: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  isSubmitting: boolean;
}

const Step3_AddressVerification: React.FC<Step3Props> = ({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  onSaveDraft,
  isSubmitting,
}) => {
  const addressData = formData.addressVerification || {
    currentAddress: { country: 'India' },
    currentTenure: { isPresent: false },
    isPermanentSameAsCurrent: true,
    permanentAddress: { country: 'India' },
    permanentTenure: { isPresent: false },
    uploadedDocuments: [],
  };

  // Local state for managing document previews and files, initialized from formData
  const [localDocs, setLocalDocs] = useState<UploadedDocument[]>(addressData.uploadedDocuments || []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    const [addressTypeOrSection, fieldName] = name.split('.');

    if (name === "isPermanentSameAsCurrent" && checked !== undefined) {
      updateFormData('addressVerification', name, checked);
    } else if (addressTypeOrSection && fieldName) {
      const currentSectionData = addressData[addressTypeOrSection as keyof AddressVerificationData] || {};
      let newValue: string | boolean | undefined = type === 'checkbox' && fieldName === 'isPresent' ? checked : value;

      if (type === 'checkbox' && fieldName === 'isPresent' && checked) {
        updateFormData('addressVerification', addressTypeOrSection, {
          ...(currentSectionData as Tenure), // Type assertion
          [fieldName]: newValue,
          toMonth: '', // Clear 'to' fields when 'isPresent'
          toYear: '',
        });
      } else {
        updateFormData('addressVerification', addressTypeOrSection, {
          ...(currentSectionData as Address | Tenure), // Type assertion
          [fieldName]: newValue,
        });
      }
    }
  };

  const handleDocumentChange = (index: number, e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as HTMLInputElement; // Assert type for files
    const updatedDocs = [...localDocs];
    const currentDoc = updatedDocs[index] || {};

    if (name === `docFile_${index}`) {
      if (files && files[0]) {
        const file = files[0];
        const previewUrl = URL.createObjectURL(file);
        updatedDocs[index] = {
          ...currentDoc,
          file: file,
          fileName: file.name,
          fileType: file.type,
          previewUrl: file.type.startsWith("image/") ? previewUrl : null,
        };
      }
    } else if (name === `docType_${index}`) {
      updatedDocs[index] = { ...currentDoc, documentType: value };
    }
    setLocalDocs(updatedDocs);
    updateFormData('addressVerification', 'uploadedDocuments', updatedDocs);
  };

  const addDocumentField = () => {
    const newDoc: UploadedDocument = { documentType: '', file: null, fileName: '', fileType: '', previewUrl: null };
    const updatedDocs = [...localDocs, newDoc];
    setLocalDocs(updatedDocs);
    // Update formData when user actually interacts or on next/save
    updateFormData('addressVerification', 'uploadedDocuments', updatedDocs);

  };

  const removeDocumentField = (index: number) => {
    const updatedDocs = localDocs.filter((_, i) => i !== index);
    setLocalDocs(updatedDocs);
    updateFormData('addressVerification', 'uploadedDocuments', updatedDocs);
  };

  const isAnyAddressDetailFilled = (): boolean => {
    const ca = addressData.currentAddress;
    const pa = addressData.permanentAddress;
    return !!(
      (ca && (ca.houseNo || ca.streetArea || ca.city || ca.pinCode)) ||
      (!addressData.isPermanentSameAsCurrent && pa && (pa.houseNo || pa.streetArea || pa.city || pa.pinCode))
    );
  };

  const handleNextClick = () => {
    if (isAnyAddressDetailFilled() && localDocs.filter(doc => doc.file).length === 0) {
      alert("If address details are filled, please upload at least one supporting document.");
      return;
    }
    // Add other validations for address fields if needed
    onSaveDraft();
    onNext();
  };

  const renderAddressFields = (addressTypePrefix: "currentAddress" | "permanentAddress") => {
    const tenureTypePrefix = addressTypePrefix === 'currentAddress' ? 'currentTenure' : 'permanentTenure';
    const address = (addressData[addressTypePrefix] as Address) || { country: 'India' };
    const tenure = (addressData[tenureTypePrefix] as Tenure) || { isPresent: false };

    return (
      <div className={styles.addressBlock}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label htmlFor={`${addressTypePrefix}.houseNo`} className={styles.label}>House/Flat/Building No.</label>
            <input type="text" name={`${addressTypePrefix}.houseNo`} id={`${addressTypePrefix}.houseNo`} value={address.houseNo || ''} onChange={handleChange} className={styles.input} disabled={isSubmitting} />
          </div>
          <div className={styles.formField}>
            <label htmlFor={`${addressTypePrefix}.streetArea`} className={styles.label}>Street/Road/Area</label>
            <input type="text" name={`${addressTypePrefix}.streetArea`} id={`${addressTypePrefix}.streetArea`} value={address.streetArea || ''} onChange={handleChange} className={styles.input} disabled={isSubmitting} />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label htmlFor={`${addressTypePrefix}.landmark`} className={styles.label}>Landmark (Optional)</label>
            <input type="text" name={`${addressTypePrefix}.landmark`} id={`${addressTypePrefix}.landmark`} value={address.landmark || ''} onChange={handleChange} className={styles.input} disabled={isSubmitting} />
          </div>
          <div className={styles.formField}>
            <label htmlFor={`${addressTypePrefix}.city`} className={styles.label}>City/Town/Village</label>
            <input type="text" name={`${addressTypePrefix}.city`} id={`${addressTypePrefix}.city`} value={address.city || ''} onChange={handleChange} className={styles.input} disabled={isSubmitting} />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label htmlFor={`${addressTypePrefix}.state`} className={styles.label}>State</label>
            <input type="text" name={`${addressTypePrefix}.state`} id={`${addressTypePrefix}.state`} value={address.state || ''} onChange={handleChange} className={styles.input} disabled={isSubmitting} />
          </div>
          <div className={styles.formField}>
            <label htmlFor={`${addressTypePrefix}.pinCode`} className={styles.label}>PIN Code</label>
            <input type="text" name={`${addressTypePrefix}.pinCode`} id={`${addressTypePrefix}.pinCode`} value={address.pinCode || ''} onChange={handleChange} className={styles.input} pattern="[0-9]{6}" maxLength={6} disabled={isSubmitting} />
          </div>
        </div>
        <div className={styles.formField}>
          <label htmlFor={`${addressTypePrefix}.country`} className={styles.label}>Country</label>
          <input type="text" name={`${addressTypePrefix}.country`} id={`${addressTypePrefix}.country`} value={address.country || 'India'} onChange={handleChange} className={styles.input} disabled={isSubmitting} />
        </div>

        <h4 className={styles.subHeading}>Tenure of Stay</h4>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label htmlFor={`${tenureTypePrefix}.fromMonth`} className={styles.label}>From Month</label>
            <select name={`${tenureTypePrefix}.fromMonth`} id={`${tenureTypePrefix}.fromMonth`} value={tenure.fromMonth || ''} onChange={handleChange} className={styles.select} disabled={isSubmitting}>
              <option value="">Month</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor={`${tenureTypePrefix}.fromYear`} className={styles.label}>From Year</label>
            <select name={`${tenureTypePrefix}.fromYear`} id={`${tenureTypePrefix}.fromYear`} value={tenure.fromYear || ''} onChange={handleChange} className={styles.select} disabled={isSubmitting}>
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label htmlFor={`${tenureTypePrefix}.toMonth`} className={styles.label}>To Month</label>
            <select name={`${tenureTypePrefix}.toMonth`} id={`${tenureTypePrefix}.toMonth`} value={tenure.toMonth || ''} onChange={handleChange} className={styles.select} disabled={isSubmitting || !!tenure.isPresent}>
              <option value="">Month</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor={`${tenureTypePrefix}.toYear`} className={styles.label}>To Year</label>
            <select name={`${tenureTypePrefix}.toYear`} id={`${tenureTypePrefix}.toYear`} value={tenure.toYear || ''} onChange={handleChange} className={styles.select} disabled={isSubmitting || !!tenure.isPresent}>
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.formFieldInline}>
          <input type="checkbox" name={`${tenureTypePrefix}.isPresent`} id={`${tenureTypePrefix}.isPresent`} checked={!!tenure.isPresent} onChange={handleChange} className={styles.checkbox} disabled={isSubmitting} />
          <label htmlFor={`${tenureTypePrefix}.isPresent`} className={styles.checkboxLabel}>Currently Residing Here / Tenure up to Present</label>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.formStep}>
      <h2 className={styles.stepTitle}>Address Verification </h2>

      <h3 className={styles.sectionSubTitle}>Current Address</h3>
      {renderAddressFields("currentAddress")}

      <div className={styles.formFieldInline}>
        <input
          type="checkbox"
          id="isPermanentSameAsCurrent"
          name="isPermanentSameAsCurrent"
          checked={!!addressData.isPermanentSameAsCurrent}
          onChange={handleChange}
          className={styles.checkbox}
          disabled={isSubmitting}
        />
        <label htmlFor="isPermanentSameAsCurrent" className={styles.checkboxLabel}>
          Permanent address is same as current address
        </label>
      </div>

      {!addressData.isPermanentSameAsCurrent && (
        <>
          <h3 className={`${styles.sectionSubTitle} ${styles.marginTopLarge}`}>Permanent Address</h3>
          {renderAddressFields("permanentAddress")}
        </>
      )}

      <h3 className={`${styles.sectionSubTitle} ${styles.marginTopLarge}`}>Document Upload</h3>
      <p className={styles.infoText}>If you have filled any address details above, please upload relevant supporting documents (e.g., Aadhar, Voter ID, Utility Bill, Rent Agreement).</p>

      {localDocs.map((doc, index) => (
        <div key={index} className={styles.documentUploadRow}>
          <div className={styles.formField}>
            <label htmlFor={`docType_${index}`} className={styles.label}>Document Type {index + 1}</label>
            <select
              name={`docType_${index}`}
              id={`docType_${index}`}
              value={doc.documentType || ''}
              onChange={(e) => handleDocumentChange(index, e)}
              className={styles.select}
              disabled={isSubmitting}
            >
              <option value="">Select Document Type</option>
              {documentTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor={`docFile_${index}`} className={styles.label}>Upload File {index + 1}</label>
            <input
              type="file"
              name={`docFile_${index}`}
              id={`docFile_${index}`}
              onChange={(e) => handleDocumentChange(index, e)}
              className={styles.inputFile}
              accept="image/*,.pdf,.doc,.docx" // Example accept types
              disabled={isSubmitting}
            />
            {doc.fileName && <p className={styles.fileNamePreview}>Selected: {doc.fileName}</p>}
            {doc.previewUrl && <img src={doc.previewUrl} alt="Preview" className={styles.imagePreviewSmall} />}
          </div>
          {localDocs.length > 0 && ( // Show remove button only if there's at least one doc, or always if >1
             <button type="button" onClick={() => removeDocumentField(index)} className={styles.removeDocButton} disabled={isSubmitting}>Remove</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addDocumentField} className={styles.addMoreButton} disabled={isSubmitting}>
        + Add Another Document
      </button>

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
};

export default Step3_AddressVerification;