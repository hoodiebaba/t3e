// src/app/bgv/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation.js';
import styles from './bgv-form.module.css';

// Import all step components
import Step1_ContactInfo from './components/Step1_ContactInfo';
import Step2_PersonalDetails from './components/Step2_PersonalDetails';
import Step3_AddressVerification from './components/Step3_AddressVerification';
import Step4_EducationVerification from './components/Step4_EducationVerification';
import Step5_EmploymentVerification from './components/Step5_EmploymentVerification';
import Step6_IdentityVerification from './components/Step6_IdentityVerification';
import Step7_Authorization from './components/Step7_Authorization';

// --- TYPE DEFINITIONS (Consider moving to a shared types.ts file) --- 
interface DocumentFile {
  id: string;
  documentType?: string;
  file?: File | null;          // File object during upload
  fileName?: string;           // Original filename
  fileType?: string;
  previewUrl?: string | null;  // Blob URL for frontend preview
  fileUrl?: string | null;     // URL after upload (from backend)
}

interface BaseEntry {
  id: number;
  uploadedDocuments: DocumentFile[];
}

interface EducationEntryData extends BaseEntry {
  qualification: string;
  otherQualificationName?: string;
  schoolNameAddress: string;
  joiningMonth: string;
  joiningYear: string;
  passingMonth: string;
  passingYear: string;
  otherDetails: string;
}

interface EmploymentEntryData extends BaseEntry {
  employerName: string;
  designation: string;
  companyAddress?: string;
  joiningMonth: string;
  joiningYear: string;
  lastWorkingMonth?: string;
  lastWorkingYear?: string;
  isPresentEmployee: boolean;
  reasonForLeaving?: string;
  uploadedDocuments: DocumentFile[];
}

interface IdentityEntryData extends BaseEntry {
  idType: string;
  otherIdTypeName?: string;
  idNumber: string;
}

interface AuthorizationData {
  employerNameForLOA?: string;
  signatureDataUrl?: string | null;   // Base64 data URL from signature pad
  signatureImageUrl?: string | null; // URL if signature is already saved
  place?: string;
  declarationDate?: string;           // DD/MM/YYYY format from frontend
}

/** 
 * Renamed from “FormData” to “BgvFormData” so it does NOT collide with the built-in FormData class.
 * This represents the shape of our multi-step form state.
 */
interface BgvFormData {
  email: string;
  mobile: string;
  alternateMobile?: string;

  personalDetails: {
    fullName: string;
    formerName?: string;
    fatherName: string;
    spouseName?: string;
    dob: string;   // Store as YYYY-MM-DD if possible
    gender: string;
    nationality: string;
    maritalStatus?: string;
    passportPhoto: {
      file?: File | null;
      fileName?: string;
      fileType?: string;
      previewUrl?: string | null;
      fileUrl?: string | null;
    } | null;
  };

  addressVerification: {
    currentAddress: {
      houseNo?: string;
      streetArea?: string;
      landmark?: string;
      city?: string;
      state?: string;
      pinCode?: string;
      country: string;
    };
    currentTenure: {
      fromMonth?: string;
      fromYear?: string;
      toMonth?: string;
      toYear?: string;
      isPresent: boolean;
    };
    isPermanentSameAsCurrent: boolean;
    permanentAddress?: {
      houseNo?: string;
      streetArea?: string;
      landmark?: string;
      city?: string;
      state?: string;
      pinCode?: string;
      country?: string;
    };
    permanentTenure?: {
      fromMonth?: string;
      fromYear?: string;
      toMonth?: string;
      toYear?: string;
      isPresent?: boolean;
    };
    uploadedDocuments: DocumentFile[];
  };

  educationVerification: EducationEntryData[];
  employmentVerification: EmploymentEntryData[];
  identityVerification: IdentityEntryData[];

  authorization: AuthorizationData;

  [key: string]: any; // For flexibility, but stricter typing is better.
}

export default function BGVFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('id');

  const initialDefaultEntryId = () => Date.now();
  const initialTodayDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const [currentStep, setCurrentStep] = useState<number>(1);

  /** 
   * ✂️ This is where we USED to have `useState<FormData>(new FormData())`. 
   * Instead, we initialize a plain object of type BgvFormData. 
   */
  const [formData, setFormData] = useState<BgvFormData>({
    email: '',
    mobile: '',
    alternateMobile: '',

    personalDetails: {
      fullName: '',
      formerName: '',
      fatherName: '',
      spouseName: '',
      dob: '',
      gender: '',
      nationality: 'Indian',
      maritalStatus: '',
      passportPhoto: null,
    },

    addressVerification: {
      currentAddress: { country: 'India' },
      currentTenure: { isPresent: false },
      isPermanentSameAsCurrent: true,
      permanentAddress: { country: 'India' },
      permanentTenure: { isPresent: false },
      uploadedDocuments: [],
    },

    educationVerification: [
      {
        id: initialDefaultEntryId(),
        qualification: '',
        otherQualificationName: '',
        schoolNameAddress: '',
        joiningMonth: '',
        joiningYear: '',
        passingMonth: '',
        passingYear: '',
        otherDetails: '',
        uploadedDocuments: [],
      },
    ],

    employmentVerification: [
      {
        id: initialDefaultEntryId(),
        employerName: '',
        designation: '',
        companyAddress: '',
        joiningMonth: '',
        joiningYear: '',
        lastWorkingMonth: '',
        lastWorkingYear: '',
        isPresentEmployee: false,
        reasonForLeaving: '',
        uploadedDocuments: [],
      },
    ],

    identityVerification: [
      {
        id: initialDefaultEntryId(),
        idType: '',
        otherIdTypeName: '',
        idNumber: '',
        uploadedDocuments: [],
      },
    ],

    authorization: {
      employerNameForLOA: 'Trinetra Pvt Ltd ',
      signatureDataUrl: null,
      signatureImageUrl: null,
      place: '',
      declarationDate: initialTodayDate,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ——————————————————————————————————————————————————————————
  // On mount, ensure each section of formData has at least its defaults
  useEffect(() => {
    if (!token) {
      notFound();
      return;
    }

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    setFormData(prev => {
      // Helper that merges an existing object with default values
      const ensureObject = (current: any, defaults: object) => ({
        ...defaults,
        ...current,
      });

      // Helper that ensures an array has at least one entry
      const ensureArray = (current: any[] | undefined, defaultFactory: () => any) =>
        current && current.length > 0 ? current : [defaultFactory()];

      return {
        ...prev,
        personalDetails: ensureObject(prev.personalDetails, {
          fullName: '',
          formerName: '',
          fatherName: '',
          spouseName: '',
          dob: '',
          gender: '',
          nationality: 'Indian',
          maritalStatus: '',
          passportPhoto: null,
        }),
        addressVerification: ensureObject(prev.addressVerification, {
          currentAddress: { country: 'India' },
          currentTenure: { isPresent: false },
          isPermanentSameAsCurrent: true,
          permanentAddress: { country: 'India' },
          permanentTenure: { isPresent: false },
          uploadedDocuments: [],
        }),
        educationVerification: ensureArray(prev.educationVerification, () => ({
          id: initialDefaultEntryId(),
          qualification: '',
          otherQualificationName: '',
          schoolNameAddress: '',
          joiningMonth: '',
          joiningYear: '',
          passingMonth: '',
          passingYear: '',
          otherDetails: '',
          uploadedDocuments: [],
        })),
        employmentVerification: ensureArray(prev.employmentVerification, () => ({
          id: initialDefaultEntryId(),
          employerName: '',
          designation: '',
          companyAddress: '',
          joiningMonth: '',
          joiningYear: '',
          lastWorkingMonth: '',
          lastWorkingYear: '',
          isPresentEmployee: false,
          reasonForLeaving: '',
          uploadedDocuments: [],
        })),
        identityVerification: ensureArray(prev.identityVerification, () => ({
          id: initialDefaultEntryId(),
          idType: '',
          otherIdTypeName: '',
          idNumber: '',
          uploadedDocuments: [],
        })),
        authorization: ensureObject(prev.authorization, {
          employerNameForLOA: 'Trinetra Pvt Ltd ',
          signatureDataUrl: null,
          signatureImageUrl: null,
          place: '',
          declarationDate: today,
        }),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // — Fetch existing draft or data if token is provided — 
  useEffect(() => {
    if (!token) {
      setError('Invalid URL: Token (id) is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/bgv-forms/${token}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            router.replace('/404');
            return null;
          }
          throw new Error(`Failed to fetch form data: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;

        // If already submitted → redirect to “thanks” page
        if (data.status === 'submitted') {
          router.replace('/thanks');
          return;
        }

        // Otherwise, merge any existing draft into our formData state
        setFormData(prev => ({
          email: data.email || prev.email,
          mobile: data.mobile || prev.mobile,
          alternateMobile: data.alternateMobile || prev.alternateMobile,

          personalDetails: {
            ...prev.personalDetails,
            ...data.personalDetails,
            dob: data.personalDetails?.dob
              ? new Date(data.personalDetails.dob).toISOString().split('T')[0]
              : prev.personalDetails.dob,
            passportPhoto: data.passportPhotoUrl
              ? {
                  fileUrl: data.passportPhotoUrl,
                  fileName: data.passportPhotoUrl.split('/').pop() || 'passport_photo.jpg',
                }
              : prev.personalDetails.passportPhoto,
          },

          addressVerification: {
            ...prev.addressVerification,
            ...data.addressVerification,
            uploadedDocuments: (data.addressVerification?.uploadedDocuments || []).map((doc: any) => ({
              ...doc,
              id: String(doc.id || Date.now().toString()),
              file: null,
            })),
          },

          educationVerification: (data.educationVerification || prev.educationVerification).map((entry: any) => ({
            ...entry,
            id: Number(entry.id) || initialDefaultEntryId(),
            uploadedDocuments: (entry.uploadedDocuments || []).map((doc: any) => ({
              ...doc,
              id: String(doc.id || Date.now().toString()),
              file: null,
            })),
          })),

          employmentVerification: (data.employmentVerification || prev.employmentVerification).map((entry: any) => ({
            ...entry,
            id: Number(entry.id) || initialDefaultEntryId(),
            uploadedDocuments: (entry.uploadedDocuments || []).map((doc: any) => ({
              ...doc,
              id: String(doc.id || Date.now().toString()),
              file: null,
            })),
          })),

          identityVerification: (data.identityVerification || prev.identityVerification).map((entry: any) => ({
            ...entry,
            id: Number(entry.id) || initialDefaultEntryId(),
            uploadedDocuments: (entry.uploadedDocuments || []).map((doc: any) => ({
              ...doc,
              id: String(doc.id || Date.now().toString()),
              file: null,
            })),
          })),

          authorization: {
            ...prev.authorization,
            ...data.authorization,
            signatureImageUrl: data.signatureImageUrl || prev.authorization.signatureImageUrl,
            signatureDataUrl: data.signatureImageUrl || null,
          },
        }));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching BGV data:', err);
        setError(`Failed to load form. ${err.message}`);
        setLoading(false);
      });
  }, [token, router]);

  const handleNextStep = () => {
    console.log('BGVFormPage: handleNextStep CALLED');
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
    } else {
      console.log("On Step 7, use the 'Submit Form' button.");
    }
  };

  const handlePreviousStep = () => {
    console.log('BGVFormPage: handlePreviousStep CALLED');
    setCurrentStep(prev => prev - 1);
  };

  /**
   * updateFormData:
   *   - `sectionName` is one of the keys in BgvFormData (e.g. 'educationVerification').
   *   - `fieldOrIndex` is either:
   *       • a string (to update a property inside an object section),  
   *       • or a number (to update a specific array entry in a “Verification” section),  
   *       • or null (to replace an entire array).
   */
  const updateFormData = (
    sectionName: keyof BgvFormData | null,
    fieldOrIndex: string | number | null,
    value: any,
    nestedValue?: any
  ) => {
    setFormData(prev => {
      const newState: any = { ...prev };

      if (
        sectionName &&
        ['educationVerification', 'employmentVerification', 'identityVerification'].includes(
          sectionName as string
        )
      ) {
        let sectionArray = [...(prev[sectionName] as any[] || [])];

        if (fieldOrIndex === null && Array.isArray(value)) {
          // Replace the entire array (e.g. when adding/removing entries)
          sectionArray = value;
        } else if (typeof fieldOrIndex === 'number') {
          if (typeof value === 'string' && nestedValue !== undefined) {
            // Update a single field inside one entry (e.g. entry[field] = nestedValue)
            sectionArray[fieldOrIndex] = {
              ...sectionArray[fieldOrIndex],
              [value]: nestedValue,
            };
          } else {
            // Replace a whole entry object
            sectionArray[fieldOrIndex] = value;
          }
        }
        newState[sectionName] = sectionArray;
      } else if (sectionName && typeof fieldOrIndex === 'string') {
        // Update a property inside an object section
        newState[sectionName] = {
          ...(prev[sectionName] as any || {}),
          [fieldOrIndex]: value,
        };
      } else if (sectionName === null && typeof fieldOrIndex === 'string') {
        // Update a top-level field
        newState[fieldOrIndex] = value;
      } else {
        console.warn('updateFormData: No matching condition for update', {
          sectionName,
          fieldOrIndex,
          value,
        });
      }

      return newState;
    });
  };

  // Function to prepare and send data to API
  const sendDataToApi = async (method: 'PUT' | 'POST') => {
    if (!token) {
      setError('Token is missing. Cannot save or submit.');
      alert('Error: Form link is invalid. Cannot proceed.');
      setIsSubmitting(false);
      return;
    }
    console.log(`Attempting to ${method === 'PUT' ? 'save draft' : 'submit form'} for token: ${token}`);
    setIsSubmitting(true);
    setError('');

    const apiEndpoint = `/api/bgv-forms/${token}`;

    // Build JSON payload from formData state
    const jsonDataPayload: any = {
      email: formData.email,
      mobile: formData.mobile,
      alternateMobile: formData.alternateMobile,
      personalDetails: {
        ...formData.personalDetails,
        passportPhoto:
          formData.personalDetails.passportPhoto?.file instanceof File
            ? {
                fileName: formData.personalDetails.passportPhoto.fileName,
                fileType: formData.personalDetails.passportPhoto.fileType,
              }
            : formData.personalDetails.passportPhoto?.fileUrl
            ? {
                fileUrl: formData.personalDetails.passportPhoto.fileUrl,
                fileName: formData.personalDetails.passportPhoto.fileName,
              }
            : null,
      },
      addressVerification: {
        ...formData.addressVerification,
        uploadedDocuments: formData.addressVerification.uploadedDocuments
          .map(doc => ({
            id: doc.id,
            documentType: doc.documentType,
            fileName: doc.file instanceof File ? doc.fileName : undefined,
            fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined,
          }))
          .filter(doc => doc.fileUrl || doc.fileName), // only send docs with URL or a new file name
      },
      educationVerification: formData.educationVerification.map(entry => ({
        ...entry,
        id: Number(entry.id) || initialDefaultEntryId(),
        uploadedDocuments: entry.uploadedDocuments
          .map(doc => ({
            id: doc.id,
            documentType: doc.documentType,
            fileName: doc.file instanceof File ? doc.fileName : undefined,
            fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined,
          }))
          .filter(doc => doc.fileUrl || doc.fileName),
      })),
      employmentVerification: formData.employmentVerification.map(entry => ({
        ...entry,
        id: Number(entry.id) || initialDefaultEntryId(),
        uploadedDocuments: entry.uploadedDocuments
          .map(doc => ({
            id: doc.id,
            documentType: doc.documentType,
            fileName: doc.file instanceof File ? doc.fileName : undefined,
            fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined,
          }))
          .filter(doc => doc.fileUrl || doc.fileName),
      })),
      identityVerification: formData.identityVerification.map(entry => ({
        ...entry,
        id: Number(entry.id) || initialDefaultEntryId(),
        uploadedDocuments: entry.uploadedDocuments
          .map(doc => ({
            id: doc.id,
            documentType: doc.documentType,
            fileName: doc.file instanceof File ? doc.fileName : undefined,
            fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined,
          }))
          .filter(doc => doc.fileUrl || doc.fileName),
      })),
      authorization: {
        ...formData.authorization,
        signatureDataUrl: formData.authorization.signatureDataUrl?.startsWith('data:image')
          ? formData.authorization.signatureDataUrl
          : undefined,
        signatureImageUrl: formData.authorization.signatureImageUrl,
      },
    };

    const apiReqFormData = new FormData();
    apiReqFormData.append('jsonData', JSON.stringify(jsonDataPayload));

    // Append new files to FormData
    if (formData.personalDetails.passportPhoto?.file instanceof File) {
      apiReqFormData.append(
        'passportPhotoFile',
        formData.personalDetails.passportPhoto.file,
        formData.personalDetails.passportPhoto.fileName
      );
    }

    formData.addressVerification.uploadedDocuments.forEach((doc, index) => {
      if (doc.file instanceof File) {
        apiReqFormData.append(`addressDoc_${index}`, doc.file, doc.fileName!);
      }
    });
    formData.educationVerification.forEach((entry, entryIndex) => {
      entry.uploadedDocuments.forEach((doc, docIndex) => {
        if (doc.file instanceof File) {
          apiReqFormData.append(
            `education_${entryIndex}_doc_${docIndex}`,
            doc.file,
            doc.fileName!
          );
        }
      });
    });
    formData.employmentVerification.forEach((entry, entryIndex) => {
      entry.uploadedDocuments.forEach((doc, docIndex) => {
        if (doc.file instanceof File) {
          apiReqFormData.append(
            `employment_${entryIndex}_doc_${docIndex}`,
            doc.file,
            doc.fileName!
          );
        }
      });
    });
    formData.identityVerification.forEach((entry, entryIndex) => {
      entry.uploadedDocuments.forEach((doc, docIndex) => {
        if (doc.file instanceof File) {
          apiReqFormData.append(
            `identity_${entryIndex}_doc_${docIndex}`,
            doc.file,
            doc.fileName!
          );
        }
      });
    });

    try {
      console.log(`Calling API: ${method} ${apiEndpoint}`);
      const response = await fetch(apiEndpoint, {
        method: method,
        body: apiReqFormData,
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({
          error: `HTTP error! Status: ${response.status}`,
        }));
        console.error('API Error Response:', errorResult);
        throw new Error(errorResult.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('API Success:', result.message, result.data);
      alert(method === 'PUT' ? 'Draft Saved Successfully!' : 'Form Submitted Successfully!');

      if (method === 'POST') {
        router.replace('/thanks');
      } else if (method === 'PUT' && result.data) {
        // Update formData with any returned URLs (e.g. passportPhotoUrl or signatureImageUrl)
        setFormData(prev => ({
          ...prev,
          personalDetails: {
            ...prev.personalDetails,
            passportPhoto: result.data.passportPhotoUrl
              ? {
                  ...prev.personalDetails.passportPhoto!,
                  fileUrl: result.data.passportPhotoUrl,
                  file: null,
                }
              : prev.personalDetails.passportPhoto!,
          },
          authorization: {
            ...prev.authorization,
            signatureImageUrl: result.data.signatureImageUrl || prev.authorization.signatureImageUrl,
            signatureDataUrl: result.data.signatureImageUrl || null,
          },
          // (You could also update uploadedDocuments array URLs here if your API returns them.)
        }));
      }
    } catch (err: any) {
      console.error(`API Error during ${method} operation:`, err);
      setError(err.message || `Failed to ${method === 'PUT' ? 'save draft' : 'submit form'}.`);
      alert(`Error: ${err.message || 'Operation failed. Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    console.log('BGVFormPage: handleSaveDraft CALLED');
    sendDataToApi('PUT');
  };

  const handleSubmitForm = () => {
    console.log('BGVFormPage: handleSubmitForm CALLED');
    if (!formData.authorization.signatureDataUrl && !formData.authorization.signatureImageUrl) {
      alert('Signature is mandatory to submit the form.');
      setIsSubmitting(false);
      return;
    }
    if (!formData.authorization.place) {
      alert('Place is mandatory in authorization step.');
      setIsSubmitting(false);
      return;
    }
    sendDataToApi('POST');
  };

  if (loading && !error) {
    return <div className={styles.loadingMessage}>Loading form... Please wait.</div>;
  }
  if (error) {
    return (
      <div className={styles.errorMessage}>
        Error: {error} <p>Try refreshing. If the problem persists, contact support. Token: {token || 'N/A'}</p>
      </div>
    );
  }

  return (
    <div className={styles.bgvFormContainer}>
      <div className={styles.formHeader}>
        <h1>Background Verification Form</h1>
        <p className={styles.formSubtitle}>Token ID: {token || 'N/A'} | Current Step: {currentStep}</p>
      </div>

      {currentStep === 1 && (
        <Step1_ContactInfo
          formData={formData}
          updateFormData={updateFormData}
          onNext={handleNextStep}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}
      {currentStep === 2 && (
        <Step2_PersonalDetails
          formData={formData}
          updateFormData={updateFormData}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}
      {currentStep === 3 && (
        <Step3_AddressVerification
          formData={formData}
          updateFormData={updateFormData}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}
      {currentStep === 4 && (
        <Step4_EducationVerification
          formData={formData}
          updateFormData={updateFormData}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}
      {currentStep === 5 && (
        <Step5_EmploymentVerification
          formData={formData}           
          updateFormData={updateFormData}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}
      {currentStep === 6 && (
        <Step6_IdentityVerification
          formData={formData}           
          updateFormData={updateFormData}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}
      {currentStep === 7 && (
        <Step7_Authorization
          formData={formData}
          updateFormData={updateFormData}
          onPrevious={handlePreviousStep}
          onSaveDraft={handleSaveDraft}
          onSubmitForm={handleSubmitForm}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
