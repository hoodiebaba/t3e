// src/app/bgv/components/Step5_EmploymentVerification.tsx

import React from 'react';
import styles from '../bgv-form.module.css'; // Use common CSS module

// Types (can be moved to a central types file)
interface DocumentFile {
  id: string;
  documentType: string;
  file?: File | null;
  fileName?: string;
  fileType?: string;
  previewUrl?: string | null;
  fileUrl?: string | null;
}

// We no longer restrict formData.employmentVerification to a local interface.
// By typing formData as `any`, the parent’s BgvFormData can be passed in directly without mismatch.
interface Step5Props {
  formData: any;
  updateFormData: (
    section: string | null,
    fieldOrIndex: string | number | null,
    value: any,
    nestedValue?: any
  ) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  isSubmitting: boolean;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 70 }, (_, i) => currentYear - i);
const months = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const employmentDocumentTypes = [
  'Offer Letter',
  'Appointment Letter',
  'Experience Letter',
  'Relieving Letter',
  'Salary Slip (Last Month)',
  'Bank Statement (Salary Credit)',
  'Form 16',
  'Other',
];

const Step5_EmploymentVerification: React.FC<Step5Props> = ({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  onSaveDraft,
  isSubmitting,
}) => {
  // Treat employmentEntries as any[] so no mismatch with parent’s type
  const employmentEntries: any[] = formData.employmentVerification || [];

  const handleEntryChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const checked = (e.target as HTMLInputElement).checked; // For checkbox

    const updatedEntries = [...employmentEntries];
    const currentEntry = { ...updatedEntries[index] };

    if (name === 'isPresentEmployee') {
      currentEntry[name] = checked;
      if (checked) {
        // If present, clear last working date and reason
        currentEntry.lastWorkingMonth = '';
        currentEntry.lastWorkingYear = '';
        currentEntry.reasonForLeaving = '';
      }
    } else {
      // @ts-ignore
      currentEntry[name] = value;
    }
    updatedEntries[index] = currentEntry;
    updateFormData('employmentVerification', null, updatedEntries);
  };

  const addEmploymentEntry = () => {
    const newEntry = {
      id: Date.now(),
      employerName: '',
      designation: '',
      companyAddress: '',
      joiningMonth: '',
      joiningYear: '',
      lastWorkingMonth: '',
      lastWorkingYear: '',
      isPresentEmployee: false,
      reasonForLeaving: '',
      uploadedDocuments: [] as DocumentFile[],
    };
    updateFormData('employmentVerification', null, [...employmentEntries, newEntry]);
  };

  const removeEmploymentEntry = (index: number) => {
    const updatedEntries = employmentEntries.filter((_, i) => i !== index);
    updateFormData('employmentVerification', null, updatedEntries);
  };

  const handleDocumentChange = (
    entryIndex: number,
    docIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;

    const updatedEntries = [...employmentEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    const updatedDocs = [...entryDocs];
    const currentDoc = { ...updatedDocs[docIndex] };

    if (name === `docFile`) {
      if (files && files[0]) {
        const file = files[0];
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
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
    updateFormData('employmentVerification', null, updatedEntries);
  };

  const addDocumentField = (entryIndex: number) => {
    const updatedEntries = [...employmentEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    const newDoc: DocumentFile = {
      id: `emp_doc_${Date.now()}`,
      documentType: '',
      file: null,
      fileName: '',
      fileType: '',
      previewUrl: null,
      fileUrl: '',
    };
    updatedEntries[entryIndex].uploadedDocuments = [...entryDocs, newDoc];
    updateFormData('employmentVerification', null, updatedEntries);
  };

  const removeDocumentField = (entryIndex: number, docIndex: number) => {
    const updatedEntries = [...employmentEntries];
    const entryDocs = updatedEntries[entryIndex].uploadedDocuments || [];
    updatedEntries[entryIndex].uploadedDocuments = entryDocs.filter((_, i) => i !== docIndex);
    updateFormData('employmentVerification', null, updatedEntries);
  };

  const handleNextClick = () => {
    let isSectionValid = true;
    employmentEntries.forEach((entry) => {
      // Validate only if any core field is filled
      const coreFilled = entry.employerName || entry.designation || entry.joiningYear;
      if (coreFilled) {
        if (
          !entry.employerName ||
          !entry.designation ||
          !entry.joiningYear ||
          (!entry.isPresentEmployee && !entry.lastWorkingYear)
        ) {
          alert(
            `Please fill all required fields (Employer, Designation, Joining Year, Last Working Year unless 'Present') for Employment Record: ${
              entry.employerName || 'New Record'
            }.`
          );
          isSectionValid = false;
          return;
        }
        if (
          !entry.uploadedDocuments ||
          entry.uploadedDocuments.length === 0 ||
          entry.uploadedDocuments.some((d: any) => !d.file && !d.fileUrl)
        ) {
          alert(`Please upload required documents for Employment Record: ${entry.employerName}.`);
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
      <h2 className={styles.stepTitle}>Employment Verification</h2>

      {employmentEntries.map((entry, index) => (
        <div key={entry.id} className={styles.entryBlock}>
          <div className={styles.entryHeader}>
            <h3 className={styles.entryTitle}>Employment Record {index + 1}</h3>
            {employmentEntries.length > 0 && (
              <button
                type="button"
                onClick={() => removeEmploymentEntry(index)}
                className={styles.removeEntryButton}
                disabled={isSubmitting}
              >
                Remove This Record
              </button>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`employerName_${index}`} className={styles.label}>
                Employer/Company Name <span className={styles.requiredAsterisk}>*</span>
              </label>
              <input
                type="text"
                name="employerName"
                id={`employerName_${index}`}
                value={entry.employerName}
                onChange={(e) => handleEntryChange(index, e)}
                className={styles.input}
                disabled={isSubmitting}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor={`designation_${index}`} className={styles.label}>
                Designation <span className={styles.requiredAsterisk}>*</span>
              </label>
              <input
                type="text"
                name="designation"
                id={`designation_${index}`}
                value={entry.designation}
                onChange={(e) => handleEntryChange(index, e)}
                className={styles.input}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label htmlFor={`companyAddress_${index}`} className={styles.label}>
              Company Address (Optional)
            </label>
            <textarea
              name="companyAddress"
              id={`companyAddress_${index}`}
              value={entry.companyAddress || ''}
              onChange={(e) => handleEntryChange(index, e)}
              className={styles.textarea}
              rows={2}
              disabled={isSubmitting}
            ></textarea>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`joiningMonth_${index}`} className={styles.label}>
                Joining Month <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                name="joiningMonth"
                id={`joiningMonth_${index}`}
                value={entry.joiningMonth}
                onChange={(e) => handleEntryChange(index, e)}
                className={styles.select}
                disabled={isSubmitting}
              >
                <option value="">Month</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor={`joiningYear_${index}`} className={styles.label}>
                Joining Year <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                name="joiningYear"
                id={`joiningYear_${index}`}
                value={entry.joiningYear}
                onChange={(e) => handleEntryChange(index, e)}
                className={styles.select}
                disabled={isSubmitting}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formFieldInline}>
            <input
              type="checkbox"
              name="isPresentEmployee"
              id={`isPresentEmployee_${index}`}
              checked={!!entry.isPresentEmployee}
              onChange={(e) => handleEntryChange(index, e)}
              className={styles.checkbox}
              disabled={isSubmitting}
            />
            <label htmlFor={`isPresentEmployee_${index}`} className={styles.checkboxLabel}>
              Currently Working Here
            </label>
          </div>

          {!entry.isPresentEmployee && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor={`lastWorkingMonth_${index}`} className={styles.label}>
                    Last Working Month <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <select
                    name="lastWorkingMonth"
                    id={`lastWorkingMonth_${index}`}
                    value={entry.lastWorkingMonth}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.select}
                    disabled={isSubmitting}
                  >
                    <option value="">Month</option>
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label htmlFor={`lastWorkingYear_${index}`} className={styles.label}>
                    Last Working Year <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <select
                    name="lastWorkingYear"
                    id={`lastWorkingYear_${index}`}
                    value={entry.lastWorkingYear}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.select}
                    disabled={isSubmitting}
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formField}>
                <label htmlFor={`reasonForLeaving_${index}`} className={styles.label}>
                  Reason For Leaving (Optional)
                </label>
                <input
                  type="text"
                  name="reasonForLeaving"
                  id={`reasonForLeaving_${index}`}
                  value={entry.reasonForLeaving}
                  onChange={(e) => handleEntryChange(index, e)}
                  className={styles.input}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          <h4 className={styles.subHeadingDocs}>Upload Documents for this Employment Record</h4>
          {(entry.uploadedDocuments || []).map((doc, docIndex) => (
            <div key={doc.id} className={styles.documentUploadRow}>
              <div className={styles.formField}>
                <label htmlFor={`docType_${index}_${docIndex}`} className={styles.label}>
                  Document Type {docIndex + 1}
                </label>
                <select
                  name="docType"
                  id={`docType_${index}_${docIndex}`}
                  value={doc.documentType}
                  onChange={(e) => handleDocumentChange(index, docIndex, e)}
                  className={styles.select}
                  disabled={isSubmitting}
                >
                  <option value="">Select Document Type</option>
                  {employmentDocumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor={`docFile_${index}_${docIndex}`} className={styles.label}>
                  Upload File {docIndex + 1}
                </label>
                <input
                  type="file"
                  name="docFile"
                  id={`docFile_${index}_${docIndex}`}
                  onChange={(e) => handleDocumentChange(index, docIndex, e)}
                  className={styles.inputFile}
                  disabled={isSubmitting}
                />
                {doc.fileName && <p className={styles.fileNamePreview}>Selected: {doc.fileName}</p>}
                {doc.previewUrl && (
                  <img src={doc.previewUrl} alt="Preview" className={styles.imagePreviewSmall} />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeDocumentField(index, docIndex)}
                className={styles.removeDocButtonMini}
                disabled={isSubmitting}
              >
                Remove Doc
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addDocumentField(index)}
            className={styles.addMoreDocsButtonMini}
            disabled={isSubmitting}
          >
            + Add Document to this Record
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addEmploymentEntry}
        className={styles.addMoreEntryButton}
        disabled={isSubmitting}
      >
        + Add Another Employment Record
      </button>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={onPrevious}
          className={styles.buttonSecondary}
          disabled={isSubmitting}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className={styles.buttonSecondary}
          disabled={isSubmitting}
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={handleNextClick}
          className={styles.buttonPrimary}
          disabled={isSubmitting}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Step5_EmploymentVerification;
