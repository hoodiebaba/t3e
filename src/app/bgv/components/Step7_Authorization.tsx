+ "use client";
  // src/app/bgv/components/Step7_Authorization.tsx

  import React, { useRef, useState, useEffect, Suspense } from 'react';
  import dynamic from 'next/dynamic';
  import styles from '../bgv-form.module.css';

 import { forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignatureCanvasWithRef = forwardRef<SignatureCanvas>((props, ref) => (
  <SignatureCanvas {...props} ref={ref} />
));

  interface AuthorizationData {
    employerNameForLOA?: string;
    signatureDataUrl?: string | null;
    place?: string;
    declarationDate?: string;
  }

  interface Step7Props {
    formData: {
      personalDetails?: { fullName?: string };
      authorization?: AuthorizationData;
      [key: string]: any;
    };
    updateFormData: (
      section: string | null,
      fieldOrIndex: string | number | null,
      value: any,
      nestedValue?: any
    ) => void;
    onPrevious: () => void;
    onSaveDraft: () => void;
    onSubmitForm: () => void;
    isSubmitting: boolean;
  }

  const Step7_Authorization: React.FC<Step7Props> = ({
    formData,
    updateFormData,
    onPrevious,
    onSaveDraft,
    onSubmitForm,
    isSubmitting,
  }) => {
    const authData =
      formData.authorization || {
        employerNameForLOA: 'YOUR_COMPANY_NAME_HERE',
        declarationDate: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      };

    // Use a loose ref type since SignatureCanvas is dynamically loaded
    const sigCanvasRef = useRef<any>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(
      authData.signatureDataUrl || null
    );

    // Autofill date on component mount if not already set
    useEffect(() => {
      if (!authData.declarationDate) {
        const today = new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        updateFormData('authorization', 'declarationDate', today);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authData.declarationDate]);

    const clearSignature = () => {
      sigCanvasRef.current?.clear();
      setSignaturePreview(null);
      updateFormData('authorization', 'signatureDataUrl', null);
    };

    const saveSignature = () => {
      if (sigCanvasRef.current) {
        if (sigCanvasRef.current.isEmpty()) {
          alert('Please provide your signature.');
          return false;
        }
        const dataUrl = sigCanvasRef.current
          .getTrimmedCanvas()
          .toDataURL('image/png');
        setSignaturePreview(dataUrl);
        updateFormData('authorization', 'signatureDataUrl', dataUrl);
        return true;
      }
      return false;
    };

    const handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFormData('authorization', 'place', e.target.value);
    };

    const handleSubmitClick = () => {
      if (!saveSignature()) {
        return; // Stop if signature is empty
      }
      if (!authData.place) {
        alert('Please enter the Place.');
        return;
      }
      // All checks passed, proceed to final submit
      onSubmitForm();
    };

    const fullNameCaps =
      formData.personalDetails?.fullName?.toUpperCase() ||
      "CANDIDATE'S FULL NAME NOT AVAILABLE";
    const employerName = authData.employerNameForLOA || '[Employer Name Not Provided]';

    return (
      <div className={styles.formStep}>
        <h2 className={styles.stepTitle}>
          Step 7: Letter of Authorization & Self Declaration
        </h2>

        <div className={styles.loaContainer}>
          <h3 className={styles.loaHeading}>LETTER OF AUTHORIZATION</h3>
          <p className={styles.loaSubHeading}>TO WHOMSOEVER IT MAY CONCERN</p>
          <p>
            I hereby authorize <strong>{employerName}</strong> to contact any former
            employers as indicated above and carry out all background checks, not
            restricted to education and employment, as deemed appropriate through this
            selection procedure.
          </p>
          <p>
            I authorize former employers, agencies, educational institutes etc. to
            release any information pertaining to my employment/education and I release
            them from any liability in doing so.
          </p>
          <p>
            I also authorize <strong>{employerName}</strong> to share/provide a
            reference check covering my services with the Company to any third
            party/agency conducting a reference check on behalf of an employer/agency.
            This authorization survives any cessation of service/training with the
            Company.
          </p>
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Please Sign in the Box Below:</label>
          <div className={styles.signaturePadContainer}>
            <Suspense fallback={<div>Loading signature pad...</div>}>
              {typeof window !== 'undefined' && (
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor='black'
                  canvasProps={{ className: styles.signatureCanvas }}
                  onEnd={saveSignature}
                />
              )}
            </Suspense>
          </div>
          <button
            type='button'
            onClick={clearSignature}
            className={styles.buttonClearSignature}
            disabled={isSubmitting}
          >
            Clear Signature
          </button>
        </div>

        <div className={styles.declarationSection}>
          <div className={styles.formField}>
            <label className={styles.label}>Full Name (IN CAPS):</label>
            <p className={styles.autoFilledText}>{fullNameCaps}</p>
          </div>

          {signaturePreview && (
            <div className={styles.formField}>
              <label className={styles.label}>
                Pen Signed Signature of the Candidate:
              </label>
              <img
                src={signaturePreview}
                alt='Signature Preview'
                className={styles.signaturePreviewImage}
              />
            </div>
          )}

          <div className={styles.formField}>
            <label htmlFor='place' className={styles.label}>
              Place <span className={styles.requiredAsterisk}>*</span>
            </label>
            <input
              type='text'
              id='place'
              name='place'
              className={styles.input}
              value={authData.place || ''}
              onChange={handlePlaceChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Date (DD-MM-YY):</label>
            <p className={styles.autoFilledText}>{authData.declarationDate}</p>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type='button'
            onClick={onPrevious}
            className={styles.buttonSecondary}
            disabled={isSubmitting}
          >
            Previous
          </button>
          <button
            type='button'
            onClick={onSaveDraft}
            className={styles.buttonSecondary}
            disabled={isSubmitting}
          >
            Save as Draft
          </button>
          <button
            type='button'
            onClick={handleSubmitClick}
            className={styles.buttonPrimary}
            disabled={isSubmitting || !signaturePreview || !authData.place}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Form'}
          </button>
        </div>
      </div>
    );
  };

  export default Step7_Authorization;
