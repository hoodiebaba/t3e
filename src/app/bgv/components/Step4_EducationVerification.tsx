import React from 'react';
import styles from '../bgv-form.module.css';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 70 }, (_, i) => currentYear - i);
const months = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' }, { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' }, { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }
];

const qualificationTypes = ["PhD", "Post Graduate", "Under Graduate", "12th/HSC", "11th", "10th/SSC", "Diploma", "Dropout", "Other"];
const educationDocumentTypes = ["Marksheet (All Semesters/Years)", "Consolidated Marksheet", "Degree Certificate", "Provisional Certificate", "Leaving Certificate", "Bonafide Certificate", "Result Copy", "Other"];

// Types
export interface EducationDocument {
  id: string;
  documentType?: string;
  file?: File | null;
  fileName?: string;
  fileType?: string;
  previewUrl?: string | null;
}

export interface EducationEntry {
  id: number | string;
  qualification: string;
  otherQualificationName?: string;
  schoolNameAddress: string;
  joiningMonth: string;
  joiningYear: string;
  passingMonth: string;
  passingYear: string;
  otherDetails: string;
  uploadedDocuments: EducationDocument[];
}

export interface Step4Props {
  formData: {
    educationVerification?: EducationEntry[];
    [key: string]: any; // for other steps
  };
  updateFormData: (
    section: string,
    field: string | null,
    value: any
  ) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  isSubmitting: boolean;
}

const Step4_EducationVerification: React.FC<Step4Props> = ({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  onSaveDraft,
  isSubmitting
}) => {
  const educationEntries: EducationEntry[] = formData.educationVerification && formData.educationVerification.length > 0
    ? formData.educationVerification
    : [{
        id: Date.now(),
        qualification: '',
        otherQualificationName: '',
        schoolNameAddress: '',
        joiningMonth: '',
        joiningYear: '',
        passingMonth: '',
        passingYear: '',
        otherDetails: '',
        uploadedDocuments: []
      }];

  const handleEntryChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedEntries = [...educationEntries];
    updatedEntries[index] = { ...updatedEntries[index], [name]: value };
    updateFormData('educationVerification', null, updatedEntries);
  };

  const addEducationEntry = () => {
    const newEntry: EducationEntry = {
      id: Date.now(),
      qualification: '',
      otherQualificationName: '',
      schoolNameAddress: '',
      joiningMonth: '',
      joiningYear: '',
      passingMonth: '',
      passingYear: '',
      otherDetails: '',
      uploadedDocuments: []
    };
    updateFormData('educationVerification', null, [...educationEntries, newEntry]);
  };

  const removeEducationEntry = (index: number) => {
    const updatedEntries = educationEntries.filter((_, i) => i !== index);
    updateFormData('educationVerification', null, updatedEntries);
  };

  const handleDocumentChange = (
    entryIndex: number,
    docIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;
    const updatedEntries = [...educationEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    const updatedDocs = [...entryDocs];

    if (name === `docFile`) {
      if (files && files[0]) {
        const file = files[0];
        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        updatedDocs[docIndex] = {
          ...updatedDocs[docIndex],
          file: file,
          fileName: file.name,
          fileType: file.type,
          previewUrl: previewUrl
        };
      }
    } else if (name === `docType`) {
      updatedDocs[docIndex] = { ...updatedDocs[docIndex], documentType: value };
    }
    updatedEntries[entryIndex].uploadedDocuments = updatedDocs;
    updateFormData('educationVerification', null, updatedEntries);
  };

  const addDocumentField = (entryIndex: number) => {
    const updatedEntries = [...educationEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    const newDoc: EducationDocument = { id: `doc_${Date.now()}`, documentType: '', file: null, fileName: '', fileType: '', previewUrl: null };
    updatedEntries[entryIndex].uploadedDocuments = [...entryDocs, newDoc];
    updateFormData('educationVerification', null, updatedEntries);
  };

  const removeDocumentField = (entryIndex: number, docIndex: number) => {
    const updatedEntries = [...educationEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    updatedEntries[entryIndex].uploadedDocuments = entryDocs.filter((_, i) => i !== docIndex);
    updateFormData('educationVerification', null, updatedEntries);
  };

  const handleNextClick = () => {
    let isSectionFilled = false;
    educationEntries.forEach(entry => {
      if (entry.qualification || entry.schoolNameAddress) {
        isSectionFilled = true;
        if (!entry.uploadedDocuments || entry.uploadedDocuments.length === 0) {
          alert(`Please upload documents for the education entry: ${entry.qualification || entry.schoolNameAddress}`);
        }
      }
    });

    onSaveDraft();
    onNext();
  };

  return (
    <div className={styles.formStep}>
      <h2 className={styles.stepTitle}>Education Verification</h2>

      {educationEntries.map((entry, index) => (
        <div key={entry.id || index} className={styles.entryBlock}>
          <div className={styles.entryHeader}>
            <h3 className={styles.entryTitle}>Education Record {index + 1}</h3>
            {educationEntries.length > 1 && (
              <button type="button" onClick={() => removeEducationEntry(index)} className={styles.removeEntryButton} disabled={isSubmitting}>
                Remove This Record
              </button>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`qualification_${index}`} className={styles.label}>Highest Qualification</label>
              <select name="qualification" id={`qualification_${index}`} value={entry.qualification || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.select} disabled={isSubmitting}>
                <option value="">Select Qualification</option>
                {qualificationTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            {entry.qualification === 'Other' && (
              <div className={styles.formField}>
                <label htmlFor={`otherQualificationName_${index}`} className={styles.label}>Please Specify Qualification</label>
                <input type="text" name="otherQualificationName" id={`otherQualificationName_${index}`} value={entry.otherQualificationName || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.input} disabled={isSubmitting} />
              </div>
            )}
          </div>

          <div className={styles.formField}>
            <label htmlFor={`schoolNameAddress_${index}`} className={styles.label}>University/School Name & Full Address</label>
            <textarea name="schoolNameAddress" id={`schoolNameAddress_${index}`} value={entry.schoolNameAddress || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.textarea} rows={3} disabled={isSubmitting}></textarea>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
                <label htmlFor={`joiningMonth_${index}`} className={styles.label}>Joining Month</label>
                <select name="joiningMonth" id={`joiningMonth_${index}`} value={entry.joiningMonth || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.select} disabled={isSubmitting}>
                    <option value="">Month</option>{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
            </div>
            <div className={styles.formField}>
                <label htmlFor={`joiningYear_${index}`} className={styles.label}>Joining Year</label>
                <select name="joiningYear" id={`joiningYear_${index}`} value={entry.joiningYear || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.select} disabled={isSubmitting}>
                    <option value="">Year</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formField}>
                <label htmlFor={`passingMonth_${index}`} className={styles.label}>Passing Month</label>
                <select name="passingMonth" id={`passingMonth_${index}`} value={entry.passingMonth || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.select} disabled={isSubmitting}>
                    <option value="">Month</option>{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
            </div>
             <div className={styles.formField}>
                <label htmlFor={`passingYear_${index}`} className={styles.label}>Passing Year</label>
                <select name="passingYear" id={`passingYear_${index}`} value={entry.passingYear || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.select} disabled={isSubmitting}>
                    <option value="">Year</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
          </div>

          <div className={styles.formField}>
            <label htmlFor={`otherDetails_${index}`} className={styles.label}>Other Details (e.g., Roll No., Percentage/CGPA, Specialization - Optional)</label>
            <input type="text" name="otherDetails" id={`otherDetails_${index}`} value={entry.otherDetails || ''} onChange={(e) => handleEntryChange(index, e)} className={styles.input} disabled={isSubmitting} />
          </div>

          <h4 className={styles.subHeadingDocs}>Upload Documents for this Record</h4>
          {(entry.uploadedDocuments || []).map((doc, docIndex) => (
            <div key={doc.id || docIndex} className={styles.documentUploadRow}>
              <div className={styles.formField}>
                <label htmlFor={`docType_${docIndex}`} className={styles.label}>Document Type {docIndex + 1}</label>
                <select name="docType" id={`docType_${docIndex}`} value={doc.documentType || ''} onChange={(e) => handleDocumentChange(index, docIndex, e)} className={styles.select} disabled={isSubmitting}>
                  <option value="">Select Document Type</option>
                  {educationDocumentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor={`docFile_${docIndex}`} className={styles.label}>Upload File {docIndex + 1}</label>
                <input type="file" name="docFile" id={`docFile_${docIndex}`} onChange={(e) => handleDocumentChange(index, docIndex, e)} className={styles.inputFile} disabled={isSubmitting} />
                {doc.fileName && <p className={styles.fileNamePreview}>Selected: {doc.fileName}</p>}
                {doc.previewUrl && <img src={doc.previewUrl} alt="Preview" className={styles.imagePreviewSmall} />}
              </div>
              {(entry.uploadedDocuments || []).length > 0 && (
                <button type="button" onClick={() => removeDocumentField(index, docIndex)} className={styles.removeDocButtonMini} disabled={isSubmitting}>Remove Doc</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addDocumentField(index)} className={styles.addMoreDocsButtonMini} disabled={isSubmitting}>
            + Add Document to this Record
          </button>
        </div>
      ))}

      <button type="button" onClick={addEducationEntry} className={styles.addMoreEntryButton} disabled={isSubmitting}>
        + Add Another Education Record
      </button>

      <div className={styles.buttonGroup}>
        <button type="button" onClick={onPrevious} className={styles.buttonSecondary} disabled={isSubmitting}>Previous</button>
        <button type="button" onClick={onSaveDraft} className={styles.buttonSecondary} disabled={isSubmitting}>Save as Draft</button>
        <button type="button" onClick={handleNextClick} className={styles.buttonPrimary} disabled={isSubmitting}>Next</button>
      </div>
    </div>
  );
};

export default Step4_EducationVerification;
