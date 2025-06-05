// src/app/bgv/components/Step6_IdentityVerification.tsx
import React from 'react';
import styles from '../bgv-form.module.css';

// Assuming DocumentFile interface is available (e.g. imported from a types file or defined in BGVFormPage)
interface DocumentFile {
  id: string;
  documentType: string; // For identity, this might be "Front Side", "Back Side", or the ID type itself
  file?: File | null;
  fileName?: string;
  fileType?: string;
  previewUrl?: string | null;
  fileUrl?: string | null;
}

interface IdentityEntryData {
  id: number;
  idType: string;
  otherIdTypeName: string;
  idNumber: string;
  uploadedDocuments: DocumentFile[];
}

interface Step6Props {
  formData: {
    identityVerification?: IdentityEntryData[];
    [key: string]: any;
  };
  updateFormData: (section: string | null, fieldOrIndex: string | number | null, value: any, nestedValue?: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  isSubmitting: boolean;
}

const idDocumentTypes = ["Aadhaar Card", "PAN Card", "Voter ID", "Driving License", "Passport", "Other"];
// For uploaded docs within an ID entry, types could be simpler or user-defined.
const identitySubDocumentTypes = ["Front Side", "Back Side", "Full Document", "Relevant Page"];


const Step6_IdentityVerification: React.FC<Step6Props> = ({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  onSaveDraft,
  isSubmitting,
}) => {
  const identityEntries = formData.identityVerification || [
    { id: Date.now(), idType: '', otherIdTypeName: '', idNumber: '', uploadedDocuments: [] },
  ];

  const handleEntryChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedEntries = [...identityEntries];
    updatedEntries[index] = { ...updatedEntries[index], [name]: value };
    // If idType is changed from 'Other', clear otherIdTypeName
    if (name === 'idType' && value !== 'Other') {
        updatedEntries[index].otherIdTypeName = '';
    }
    updateFormData('identityVerification', null, updatedEntries);
  };

  const addIdentityEntry = () => {
    const newEntry: IdentityEntryData = {
      id: Date.now(), idType: '', otherIdTypeName: '', idNumber: '', uploadedDocuments: [],
    };
    updateFormData('identityVerification', null, [...identityEntries, newEntry]);
  };

  const removeIdentityEntry = (index: number) => {
    const updatedEntries = identityEntries.filter((_, i) => i !== index);
    updateFormData('identityVerification', null, updatedEntries);
  };

  const handleDocumentChange = (entryIndex: number, docIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;

    const updatedEntries = [...identityEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    const updatedDocs = [...entryDocs];
    const currentDoc = { ...updatedDocs[docIndex] };

    if (name === `docFile`) {
      if (files && files[0]) {
        const file = files[0];
        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        currentDoc.file = file;
        currentDoc.fileName = file.name;
        currentDoc.fileType = file.type;
        currentDoc.previewUrl = previewUrl;
      }
    } else if (name === `docType`) {
      currentDoc.documentType = value;
    }
    updatedDocs[docIndex] = currentDoc;
    updatedEntries[entryIndex].uploadedDocuments = updatedDocs;
    updateFormData('identityVerification', null, updatedEntries);
  };

  const addDocumentField = (entryIndex: number) => {
    const updatedEntries = [...identityEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    const newDoc: DocumentFile = { id: `id_doc_${Date.now()}`, documentType: '', file: null, fileName: '', fileType: '', previewUrl: null };
    updatedEntries[entryIndex].uploadedDocuments = [...entryDocs, newDoc];
    updateFormData('identityVerification', null, updatedEntries);
  };

  const removeDocumentField = (entryIndex: number, docIndex: number) => {
    const updatedEntries = [...identityEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    updatedEntries[entryIndex].uploadedDocuments = entryDocs.filter((_, i) => i !== docIndex);
    updateFormData('identityVerification', null, updatedEntries);
  };

  const handleNextClick = () => {
    let isSectionValid = true;
    identityEntries.forEach(entry => {
      if (entry.idType || entry.idNumber ) { // If any core field is filled
        if (!entry.idType || (entry.idType === 'Other' && !entry.otherIdTypeName) || !entry.idNumber) {
            alert(`Please fill all required fields (ID Type, ID Number) for Identity Record: ${entry.idType === 'Other' ? entry.otherIdTypeName : entry.idType || 'New Record'}.`);
            isSectionValid = false;
            return;
        }
        if (!entry.uploadedDocuments || entry.uploadedDocuments.length === 0 || entry.uploadedDocuments.some(d => !d.file && !d.fileUrl)) {
          alert(`Please upload required documents for Identity Record: ${entry.idType === 'Other' ? entry.otherIdTypeName : entry.idType}.`);
          isSectionValid = false;
          return; 
        }
      }
    });

    if (!isSectionValid) return;

    onSaveDraft();
    onNext();
  };

  return (
    <div className={styles.formStep}>
      <h2 className={styles.stepTitle}>Identity Verification</h2>

      {identityEntries.map((entry, index) => (
        <div key={entry.id} className={styles.entryBlock}>
          <div className={styles.entryHeader}>
            <h3 className={styles.entryTitle}>Identity Document {index + 1}</h3>
            {identityEntries.length > 0 && (
              <button type="button" onClick={() => removeIdentityEntry(index)} className={styles.removeEntryButton} disabled={isSubmitting}>
                Remove This ID
              </button>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`idType_${index}`} className={styles.label}>ID Document Type <span className={styles.requiredAsterisk}>*</span></label>
              <select name="idType" id={`idType_${index}`} value={entry.idType} onChange={(e) => handleEntryChange(index, e)} className={styles.select} disabled={isSubmitting}>
                <option value="">Select ID Type</option>
                {idDocumentTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            {entry.idType === 'Other' && (
              <div className={styles.formField}>
                <label htmlFor={`otherIdTypeName_${index}`} className={styles.label}>Specify Document Name <span className={styles.requiredAsterisk}>*</span></label>
                <input type="text" name="otherIdTypeName" id={`otherIdTypeName_${index}`} value={entry.otherIdTypeName} onChange={(e) => handleEntryChange(index, e)} className={styles.input} disabled={isSubmitting} />
              </div>
            )}
          </div>

          <div className={styles.formField}>
            <label htmlFor={`idNumber_${index}`} className={styles.label}>ID Number <span className={styles.requiredAsterisk}>*</span></label>
            <input type="text" name="idNumber" id={`idNumber_${index}`} value={entry.idNumber} onChange={(e) => handleEntryChange(index, e)} className={styles.input} disabled={isSubmitting} />
          </div>
          
          <h4 className={styles.subHeadingDocs}>Upload Copy of this ID Document</h4>
          {(entry.uploadedDocuments || []).map((doc, docIndex) => (
            <div key={doc.id} className={styles.documentUploadRow}>
              <div className={styles.formField}>
                <label htmlFor={`id_docType_${index}_${docIndex}`} className={styles.label}>Document Part {docIndex + 1} (e.g., Front/Back)</label>
                <select 
                    name="docType" 
                    id={`id_docType_${index}_${docIndex}`} 
                    value={doc.documentType} 
                    onChange={(e) => handleDocumentChange(index, docIndex, e)} 
                    className={styles.select} 
                    disabled={isSubmitting}
                >
                  <option value="">Select Part</option>
                  {identitySubDocumentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor={`id_docFile_${index}_${docIndex}`} className={styles.label}>Upload File {docIndex + 1}</label>
                <input type="file" name="docFile" id={`id_docFile_${index}_${docIndex}`} onChange={(e) => handleDocumentChange(index, docIndex, e)} className={styles.inputFile} disabled={isSubmitting} />
                {doc.fileName && <p className={styles.fileNamePreview}>Selected: {doc.fileName}</p>}
                {doc.previewUrl && <img src={doc.previewUrl} alt="Preview" className={styles.imagePreviewSmall} />}
              </div>
              <button type="button" onClick={() => removeDocumentField(index, docIndex)} className={styles.removeDocButtonMini} disabled={isSubmitting}>Remove Doc</button>
            </div>
          ))}
          <button type="button" onClick={() => addDocumentField(index)} className={styles.addMoreDocsButtonMini} disabled={isSubmitting}>
            + Add Document/Part (e.g., Back side)
          </button>
        </div>
      ))}

      <button type="button" onClick={addIdentityEntry} className={styles.addMoreEntryButton} disabled={isSubmitting}>
        + Add Another ID Document
      </button>

      <div className={styles.buttonGroup}>
        <button type="button" onClick={onPrevious} className={styles.buttonSecondary} disabled={isSubmitting}>Previous</button>
        <button type="button" onClick={onSaveDraft} className={styles.buttonSecondary} disabled={isSubmitting}>Save as Draft</button>
        <button type="button" onClick={handleNextClick} className={styles.buttonPrimary} disabled={isSubmitting}>Next</button>
      </div>
    </div>
  );
};

export default Step6_IdentityVerification;