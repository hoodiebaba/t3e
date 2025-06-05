// src/app/bgv/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  id: string; // Can be frontend generated (e.g., Date.now().toString()) or from DB
  documentType?: string;
  file?: File | null; // File object during upload
  fileName?: string; // Original filename
  fileType?: string;
  previewUrl?: string | null; // Blob URL for frontend preview
  fileUrl?: string | null; // URL after upload, from backend
}

interface BaseEntry {
  id: number; // Keep as number for frontend state if consistently used. API can handle string/number conversion if needed.
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
  otherDetails?: string;
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
}

interface IdentityEntryData extends BaseEntry {
  idType: string;
  otherIdTypeName?: string;
  idNumber: string;
}

interface AuthorizationData {
  employerNameForLOA?: string;
  signatureDataUrl?: string | null; // Base64 data URL from signature pad
  signatureImageUrl?: string | null; // URL if signature is already saved
  place?: string;
  declarationDate?: string; // DD/MM/YYYY format from frontend
}

interface FormData {
  email: string;
  mobile: string;
  alternateMobile?: string;
  personalDetails: {
    fullName: string;
    formerName?: string;
    fatherName: string;
    spouseName?: string;
    dob: string; // Store as YYYY-MM-DD if possible, or parse before sending
    gender: string;
    nationality: string;
    maritalStatus?: string;
    passportPhoto: {
      file?: File | null;
      fileName?: string;
      fileType?: string;
      previewUrl?: string | null;
      fileUrl?: string | null; // URL from backend
    } | null;
  };
  addressVerification: {
    currentAddress: { houseNo?: string; streetArea?: string; landmark?: string; city?: string; state?: string; pinCode?: string; country: string };
    currentTenure: { fromMonth?: string; fromYear?: string; toMonth?: string; toYear?: string; isPresent: boolean };
    isPermanentSameAsCurrent: boolean;
    permanentAddress?: { houseNo?: string; streetArea?: string; landmark?: string; city?: string; state?: string; pinCode?: string; country?: string };
    permanentTenure?: { fromMonth?: string; fromYear?: string; toMonth?: string; toYear?: string; isPresent?: boolean };
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

  const initialDefaultEntryId = () => Date.now(); // Function to get a new number ID
  const initialTodayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>({
    email: '', mobile: '', alternateMobile: '',
    personalDetails: { fullName: '', formerName: '', fatherName: '', spouseName: '', dob: '', gender: '', nationality: 'Indian', maritalStatus: '', passportPhoto: null },
    addressVerification: { currentAddress: { country: 'India' }, currentTenure: { isPresent: false }, isPermanentSameAsCurrent: true, permanentAddress: { country: 'India' }, permanentTenure: { isPresent: false }, uploadedDocuments: [] },
    educationVerification: [{ id: initialDefaultEntryId(), qualification: '', otherQualificationName: '', schoolNameAddress: '', joiningMonth: '', joiningYear: '', passingMonth: '', passingYear: '', otherDetails: '', uploadedDocuments: [] }],
    employmentVerification: [{ id: initialDefaultEntryId(), employerName: '', designation: '', companyAddress: '', joiningMonth: '', joiningYear: '', lastWorkingMonth: '', lastWorkingYear: '', isPresentEmployee: false, reasonForLeaving: '', uploadedDocuments: [] }],
    identityVerification: [{ id: initialDefaultEntryId(), idType: '', otherIdTypeName: '', idNumber: '', uploadedDocuments: [] }],
    authorization: { employerNameForLOA: "Trinetra Pvt Ltd ", signatureDataUrl: null, signatureImageUrl: null, place: '', declarationDate: initialTodayDate },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useEffect to initialize form data structure robustly
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    setFormData(prev => {
      const ensureObject = (current: any, defaults: object) => ({ ...defaults, ...current });
      const ensureArray = (current: any[] | undefined, defaultFactory: () => any) => (current && current.length > 0) ? current : [defaultFactory()];

      return {
        ...prev,
        personalDetails: ensureObject(prev.personalDetails, { fullName: '', formerName: '', fatherName: '', spouseName: '', dob: '', gender: '', nationality: 'Indian', maritalStatus: '', passportPhoto: null }),
        addressVerification: ensureObject(prev.addressVerification, { currentAddress: { country: 'India' }, currentTenure: { isPresent: false }, isPermanentSameAsCurrent: true, permanentAddress: { country: 'India' }, permanentTenure: { isPresent: false }, uploadedDocuments: [] }),
        educationVerification: ensureArray(prev.educationVerification, () => ({ id: initialDefaultEntryId(), qualification: '', otherQualificationName: '', schoolNameAddress: '', joiningMonth: '', joiningYear: '', passingMonth: '', passingYear: '', otherDetails: '', uploadedDocuments: [] })),
        employmentVerification: ensureArray(prev.employmentVerification, () => ({ id: initialDefaultEntryId(), employerName: '', designation: '', companyAddress: '', joiningMonth: '', joiningYear: '', lastWorkingMonth: '', lastWorkingYear: '', isPresentEmployee: false, reasonForLeaving: '', uploadedDocuments: [] })),
        identityVerification: ensureArray(prev.identityVerification, () => ({ id: initialDefaultEntryId(), idType: '', otherIdTypeName: '', idNumber: '', uploadedDocuments: [] })),
        authorization: ensureObject(prev.authorization, { employerNameForLOA: "Trinetra Pvt Ltd ", signatureDataUrl: null, signatureImageUrl: null, place: '', declarationDate: today }),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect to fetch existing form data when token is available
  useEffect(() => {
    if (!token) {
      setError('Invalid URL: Token (id) is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log(`Fetching data for token: ${token}`);
    fetch(`/api/bgv-forms/${token}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) { // Form link valid, but no data yet
            console.log("GET response: Form link valid, no data yet.");
            return null; // Treat as no data, don't throw error
          }
          throw new Error(`Failed to fetch form data: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data && data.status === "pending_user_input") {
            console.log("No existing draft, starting fresh based on API message.");
        } else if (data) {
            console.log("Fetched existing BGV data:", data);
            // Merge fetched data into existing formData structure
            setFormData(prev => ({
                email: data.email || prev.email,
                mobile: data.mobile || prev.mobile,
                alternateMobile: data.alternateMobile || prev.alternateMobile,
                personalDetails: { ...prev.personalDetails, ...data.personalDetails, dob: data.personalDetails?.dob ? new Date(data.personalDetails.dob).toISOString().split('T')[0] : prev.personalDetails.dob, passportPhoto: data.passportPhotoUrl ? { fileUrl: data.passportPhotoUrl, fileName: data.passportPhotoUrl.split('/').pop() || 'passport_photo.jpg' } : prev.personalDetails.passportPhoto },
                addressVerification: { ...prev.addressVerification, ...data.addressVerification, uploadedDocuments: (data.addressVerification?.uploadedDocuments || []).map((doc: any) => ({...doc, id: String(doc.id || Date.now().toString()), file: null})) },
                educationVerification: (data.educationVerification || prev.educationVerification).map((entry: any) => ({...entry, id: Number(entry.id) || initialDefaultEntryId(), uploadedDocuments: (entry.uploadedDocuments || []).map((doc: any) => ({...doc, id: String(doc.id || Date.now().toString()), file: null}))})),
                employmentVerification: (data.employmentVerification || prev.employmentVerification).map((entry: any) => ({...entry, id: Number(entry.id) || initialDefaultEntryId(), uploadedDocuments: (entry.uploadedDocuments || []).map((doc: any) => ({...doc, id: String(doc.id || Date.now().toString()), file: null}))})),
                identityVerification: (data.identityVerification || prev.identityVerification).map((entry: any) => ({...entry, id: Number(entry.id) || initialDefaultEntryId(), uploadedDocuments: (entry.uploadedDocuments || []).map((doc: any) => ({...doc, id: String(doc.id || Date.now().toString()), file: null}))})),
                authorization: { ...prev.authorization, ...data.authorization, signatureImageUrl: data.signatureImageUrl || prev.authorization.signatureImageUrl, signatureDataUrl: data.signatureImageUrl || null }, // if image exists, show it
            }));
        } else {
            console.log("No existing BGV form data found (or 404 treated as no data).");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching BGV data:", err);
        setError(`Failed to load form. ${err.message}`);
        setLoading(false);
      });
  }, [token]);


  const handleNextStep = () => {
    console.log('BGVFormPage: handleNextStep CALLED');
    // Potentially call onSaveDraft here if you want to save on every step change
    // handleSaveDraft(); 
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

  const updateFormData = (
    sectionName: keyof FormData | null,
    fieldOrIndex: string | number | null,
    value: any,
    nestedValue?: any
  ) => {
    setFormData(prev => {
      const newState = { ...prev }; // Create a shallow copy

      if (sectionName && ['educationVerification', 'employmentVerification', 'identityVerification'].includes(sectionName)) {
        let sectionArray = [...(prev[sectionName as keyof FormData] as any[] || [])]; // Deep copy array

        if (fieldOrIndex === null && Array.isArray(value)) { // Replace whole array (e.g. on add/remove entry)
          sectionArray = value;
        } else if (typeof fieldOrIndex === 'number') { // Update specific entry or field in entry
            if(typeof value === 'string' && nestedValue !== undefined) { // Update field within an entry
                 sectionArray[fieldOrIndex] = {
                    ...sectionArray[fieldOrIndex],
                    [value]: nestedValue,
                };
            } else { // Replace whole entry object (less common here)
                sectionArray[fieldOrIndex] = value;
            }
        }
        (newState[sectionName as keyof FormData] as any) = sectionArray;

      } else if (sectionName && typeof fieldOrIndex === 'string') { // Update object section
        (newState[sectionName as keyof FormData] as any) = {
          ...(prev[sectionName as keyof FormData] || {}),
          [fieldOrIndex]: value,
        };
      } else if (sectionName === null && typeof fieldOrIndex === 'string') { // Update top-level field
        (newState as any)[fieldOrIndex] = value;
      } else {
        console.warn("updateFormData: No matching condition for update", { sectionName, fieldOrIndex, value });
      }
      return newState;
    });
  };

  // Function to prepare and send data to API
  const sendDataToApi = async (method: 'PUT' | 'POST') => {
    if (!token) {
      setError("Token is missing. Cannot save or submit.");
      alert("Error: Form link is invalid. Cannot proceed.");
      setIsSubmitting(false);
      return;
    }
    console.log(`Attempting to ${method === 'PUT' ? 'save draft' : 'submit form'} for token: ${token}`);
    setIsSubmitting(true);
    setError('');

    const apiEndpoint = `/api/bgv-forms/${token}`;
    
    const jsonDataPayload: any = {
      email: formData.email,
      mobile: formData.mobile,
      alternateMobile: formData.alternateMobile,
      personalDetails: {
        ...formData.personalDetails,
        passportPhoto: formData.personalDetails.passportPhoto?.file instanceof File
          ? { fileName: formData.personalDetails.passportPhoto.fileName, fileType: formData.personalDetails.passportPhoto.fileType }
          : (formData.personalDetails.passportPhoto?.fileUrl ? { fileUrl: formData.personalDetails.passportPhoto.fileUrl, fileName: formData.personalDetails.passportPhoto.fileName } : null)
      },
      addressVerification: {
        ...formData.addressVerification,
        uploadedDocuments: formData.addressVerification.uploadedDocuments.map(doc => ({
          id: doc.id, documentType: doc.documentType,
          fileName: doc.file instanceof File ? doc.fileName : undefined,
          fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined
        })).filter(doc => doc.fileUrl || doc.fileName) // Send only docs with URL or new file
      },
      educationVerification: formData.educationVerification.map(entry => ({
        ...entry, id: Number(entry.id) || initialDefaultEntryId(),
        uploadedDocuments: entry.uploadedDocuments.map(doc => ({
            id: doc.id, documentType: doc.documentType,
            fileName: doc.file instanceof File ? doc.fileName : undefined,
            fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined
        })).filter(doc => doc.fileUrl || doc.fileName)
      })),
      employmentVerification: formData.employmentVerification.map(entry => ({
        ...entry, id: Number(entry.id) || initialDefaultEntryId(),
        uploadedDocuments: entry.uploadedDocuments.map(doc => ({
            id: doc.id, documentType: doc.documentType,
            fileName: doc.file instanceof File ? doc.fileName : undefined,
            fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined
        })).filter(doc => doc.fileUrl || doc.fileName)
      })),
      identityVerification: formData.identityVerification.map(entry => ({
        ...entry, id: Number(entry.id) || initialDefaultEntryId(),
        uploadedDocuments: entry.uploadedDocuments.map(doc => ({
            id: doc.id, documentType: doc.documentType,
            fileName: doc.file instanceof File ? doc.fileName : undefined,
            fileUrl: !(doc.file instanceof File) ? doc.fileUrl : undefined
        })).filter(doc => doc.fileUrl || doc.fileName)
      })),
      authorization: {
          ...formData.authorization,
          // Send signatureDataUrl if it's a new base64 string.
          // If signatureImageUrl exists (from loaded draft), API will use that if signatureDataUrl is not a new base64.
          signatureDataUrl: formData.authorization.signatureDataUrl?.startsWith('data:image') ? formData.authorization.signatureDataUrl : undefined,
          signatureImageUrl: formData.authorization.signatureImageUrl // Send existing URL
      }
    };

    const apiReqFormData = new FormData();
    apiReqFormData.append('jsonData', JSON.stringify(jsonDataPayload));

    // Append new files
    if (formData.personalDetails.passportPhoto?.file instanceof File) {
      apiReqFormData.append('passportPhotoFile', formData.personalDetails.passportPhoto.file, formData.personalDetails.passportPhoto.fileName);
    }

    formData.addressVerification.uploadedDocuments.forEach((doc, index) => {
      if (doc.file instanceof File) {
        apiReqFormData.append(`addressDoc_${index}`, doc.file, doc.fileName);
      }
    });
    formData.educationVerification.forEach((entry, entryIndex) => {
      entry.uploadedDocuments.forEach((doc, docIndex) => {
        if (doc.file instanceof File) {
          apiReqFormData.append(`education_${entryIndex}_doc_${docIndex}`, doc.file, doc.fileName);
        }
      });
    });
    formData.employmentVerification.forEach((entry, entryIndex) => {
      entry.uploadedDocuments.forEach((doc, docIndex) => {
        if (doc.file instanceof File) {
          apiReqFormData.append(`employment_${entryIndex}_doc_${docIndex}`, doc.file, doc.fileName);
        }
      });
    });
    formData.identityVerification.forEach((entry, entryIndex) => {
      entry.uploadedDocuments.forEach((doc, docIndex) => {
        if (doc.file instanceof File) {
          apiReqFormData.append(`identity_${entryIndex}_doc_${docIndex}`, doc.file, doc.fileName);
        }
      });
    });
    
    try {
      console.log(`Calling API: ${method} ${apiEndpoint}`);
      // console.log("jsonData being sent:", jsonDataPayload); // For deep debugging of payload
      const response = await fetch(apiEndpoint, { method: method, body: apiReqFormData });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: `HTTP error! Status: ${response.status}` }));
        console.error("API Error Response:", errorResult);
        throw new Error(errorResult.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('API Success:', result.message, result.data);
      alert(method === 'PUT' ? 'Draft Saved Successfully!' : 'Form Submitted Successfully!');
      
      if (method === 'POST') {
        router.replace(`/thank-you?formType=bgv_submitted&token=${token}`);
      } else if (method === 'PUT' && result.data) {
        // Update formData with any URLs returned from the draft save (e.g., new file URLs)
         setFormData(prev => ({
            ...prev,
            personalDetails: { ...prev.personalDetails, passportPhoto: result.data.passportPhotoUrl ? { ...prev.personalDetails.passportPhoto, fileUrl: result.data.passportPhotoUrl, file: null } : prev.personalDetails.passportPhoto },
            authorization: { ...prev.authorization, signatureImageUrl: result.data.signatureImageUrl || prev.authorization.signatureImageUrl, signatureDataUrl: result.data.signatureImageUrl || null },
            // TODO: Update URLs for documents in arrays as well if API returns them granularly
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
        alert("Signature is mandatory to submit the form.");
        setIsSubmitting(false);
        return;
    }
     if (!formData.authorization.place) {
        alert("Place is mandatory in authorization step.");
        setIsSubmitting(false);
        return;
    }
    sendDataToApi('POST');
  };

  if (loading && !error) return <div className={styles.loadingMessage}>Loading form... Please wait.</div>;
  if (error) return <div className={styles.errorMessage}>Error: {error} <p>Try refreshing. If the problem persists, contact support. Token: {token || 'N/A'}</p></div>;

  return (
    <div className={styles.bgvFormContainer}>
      <div className={styles.formHeader}>
        <h1>Background Verification Form</h1>
        <p className={styles.formSubtitle}>Token ID: {token || "N/A"} | Current Step: {currentStep}</p>
      </div>

      {currentStep === 1 && <Step1_ContactInfo formData={formData} updateFormData={updateFormData} onNext={handleNextStep} onSaveDraft={handleSaveDraft} isSubmitting={isSubmitting} />}
      {currentStep === 2 && <Step2_PersonalDetails formData={formData} updateFormData={updateFormData} onNext={handleNextStep} onPrevious={handlePreviousStep} onSaveDraft={handleSaveDraft} isSubmitting={isSubmitting} />}
      {currentStep === 3 && <Step3_AddressVerification formData={formData} updateFormData={updateFormData} onNext={handleNextStep} onPrevious={handlePreviousStep} onSaveDraft={handleSaveDraft} isSubmitting={isSubmitting} />}
      {currentStep === 4 && <Step4_EducationVerification formData={formData} updateFormData={updateFormData} onNext={handleNextStep} onPrevious={handlePreviousStep} onSaveDraft={handleSaveDraft} isSubmitting={isSubmitting} />}
      {currentStep === 5 && <Step5_EmploymentVerification formData={formData} updateFormData={updateFormData} onNext={handleNextStep} onPrevious={handlePreviousStep} onSaveDraft={handleSaveDraft} isSubmitting={isSubmitting} />}
      {currentStep === 6 && <Step6_IdentityVerification formData={formData} updateFormData={updateFormData} onNext={handleNextStep} onPrevious={handlePreviousStep} onSaveDraft={handleSaveDraft} isSubmitting={isSubmitting} />}
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
