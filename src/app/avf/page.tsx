'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import styles from './avf-response.module.css';

// Add this just after your imports, before AVFResponsePage function

function MobileOnlyBlock() {
  return (
    <div className={styles.bgPage}>
      <div className={styles.centerCard}>
        <div className={styles.iconBox}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#ef4444" fillOpacity="0.15"/>
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className={styles.errorCard}>
          Please use your <b>Mobile Device</b> only to complete your Address Verification.
        </div>
      </div>
    </div>
  );
}

export default function AVFResponsePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('id');
  const router = useRouter();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(''); // General error for Step 2
  const [step1Error, setStep1Error] = useState(''); // Specific error for Step 1 (e.g., location)
  const [isMobile, setIsMobile] = useState(true);
  const [location, setLocation] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true); // To track location fetching
  const [reloaded, setReloaded] = useState(false);
  const [step, setStep] = useState(1);
  const [showReloadedWarning, setShowReloadedWarning] = useState(true);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [relationship, setRelationship] = useState('Self');
  const [residenceType, setResidenceType] = useState('Owned');
  const [residingSince, setResidingSince] = useState('');
  const [landmark, setLandmark] = useState('');
  const [govtIdType, setGovtIdType] = useState('PAN');
  const [govtIdPhotos, setGovtIdPhotos] = useState([]);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [outsideHousePhoto, setOutsideHousePhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturingFor, setCapturingFor] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

 
 
   useEffect(() => {
  const checkMobile = () => {
    const ua = navigator.userAgent;
    setIsMobile(/android|iphone|ipad|ipod|windows phone|mobile/i.test(ua));
  };
  checkMobile();
}, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.performance) {
      if (performance.navigation.type === 1) {
        setReloaded(true);
        setShowReloadedWarning(true);
        setTimeout(() => setShowReloadedWarning(false), 3000);
      } else {
        setShowReloadedWarning(false); // Don't show if not a reload
      }
    }
  }, []);

  useEffect(() => {
    // Try to get location as soon as component mounts for Step 1
    setIsLocationLoading(true);
    setStep1Error(''); // Clear previous step 1 errors
    if (isMobile && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setStep1Error(''); // Clear error if location is successful
          setIsLocationLoading(false);
        },
        err => {
          console.error("Error getting location. Code:", err.code, "Message:", err.message);
          setLocation(null);
          // Set specific error for Step 1
          if (err.code === 1) { // PERMISSION_DENIED
            setStep1Error('Location permission denied. Please enable it in your browser/OS settings to proceed.');
          } else {
            setStep1Error('Could not retrieve location. Please ensure GPS is enabled and try again.');
          }
          setIsLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
        setStep1Error('Geolocation is not supported by this browser or device.');
        setIsLocationLoading(false);
    }
  }, [isMobile]); // Runs once on mount due to isMobile being stable initially

 

useEffect(() => {
  if (!token) {
    setLoading(false);
    router.replace('/404');
    return;
  }
  
  async function fetchData() {
    setLoading(true);
    setError('');
    setStep1Error('');
    try {
      const res = await fetch(`/api/form-links/${token}`);
      if (res.status === 404) {
        router.replace('/404');
        return;
      }
      const data = await res.json();
      if (data.ok && data.form) {
        setFormData(data.form);
        if (data.form.status === "submitted") {
          router.replace('/thanks');
        }
      } else {
        setError(data.error || "Failed to load valid form details.");
      }
    } catch (err) {
      setError(`Failed to load form details: ${err.message}. Please check the link or try again later.`);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, [token, router]);


 if (!isMobile && !loading) {
    return <MobileOnlyBlock />;
  }

  // --- NEW startCamera function ---
  const startCamera = async (type) => {
    setCameraError(''); // Clear previous camera errors
    setShowCamera(true); 
    setCapturingFor(type);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1280 },    
            height: { ideal: 720 } 
          } 
        });
        setCameraStream(stream); 

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded:', videoRef.current.videoWidth, videoRef.current.videoHeight);
            videoRef.current.play().catch(err => { 
              console.error("Video play failed:", err);
              setCameraError(`Failed to play video stream: ${err.message}. Please ensure camera is not in use by another app.`);
              stopCamera(); 
            });
          };
          videoRef.current.onplaying = () => {
            console.log("Video stream is now actively playing.");
            setCameraError(''); 
          };
          videoRef.current.onerror = (e) => {
            console.error("Video element encountered an error:", e);
            setCameraError("An error occurred with the video display. Please try reopening the camera.");
            stopCamera();
          };
        } else {
           setCameraError("Video element not available. Please refresh.");
           setShowCamera(false);
        }
      } catch (err) {
        console.error("Error accessing camera (getUserMedia):", err.name, err.message);
        let userMessage = "Could not access camera. Please ensure permissions are granted and no other app is using the camera.";
        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          userMessage = "No camera found. Please ensure a camera is connected/enabled.";
        } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          userMessage = "Camera permission denied. Please enable it in your browser/OS settings and refresh.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          userMessage = "Camera is currently in use or cannot be started (hardware error). Try closing other apps or restarting your device.";
        } else if (err.name === "OverconstrainedError") {
          userMessage = `The camera does not support requested settings (e.g., facingMode 'environment' or resolution). Error: ${err.constraint}`;
        }
        setCameraError(userMessage);
        setShowCamera(false); 
        setCameraStream(null); 
      }
    } else {
      setCameraError("Camera API (getUserMedia) is not supported by this browser.");
      setShowCamera(false);
    }
  };

  // Your existing stopCamera function (it's generally fine)
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setShowCamera(false);
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  };

  // --- NEW takePicture function ---
  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("takePicture: Refs not available.");
      setCameraError("Camera components not ready. Please try again.");
      return;
    }
  
    const video = videoRef.current;
    if (video.paused || video.ended || video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < video.HAVE_METADATA) {
      console.warn("takePicture: Video not ready or no video data.", {
        paused: video.paused, ended: video.ended, 
        width: video.videoWidth, height: video.videoHeight,
        readyState: video.readyState
      });
      setCameraError("Camera not ready to capture. Please wait for video to appear clearly or try re-opening camera.");
      return;
    }
  
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
  
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
  
      if (!dataUrl || dataUrl === "data:,") {
          console.error("Failed to generate Data URL from canvas.");
          setCameraError("Failed to capture image (empty data). Please try again.");
          return;
      }
      // console.log("Captured Data URL (first 100 chars):", dataUrl.substring(0, 100));
  
      if (capturingFor === 'govtId') {
        if (govtIdPhotos.length < 2) {
          setGovtIdPhotos(prevPhotos => [...prevPhotos, dataUrl]);
        }
        if (govtIdPhotos.length + 1 >= 2) { 
          stopCamera(); 
        }
      } else if (capturingFor === 'selfie') {
        setSelfiePhoto(dataUrl);
        stopCamera(); 
      } else if (capturingFor === 'outsideHouse') {
        setOutsideHousePhoto(dataUrl);
        stopCamera(); 
      }
    } catch (e) {
      console.error("Error during canvas drawImage or toDataURL:", e);
      setCameraError("An error occurred while finalizing the photo. Please try again.");
    }
  };

  // Your existing removePhoto function (it's generally fine)
  const removePhoto = (type, index = -1) => {
    if (type === 'govtId') {
      setGovtIdPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index));
    } else if (type === 'selfie') {
      setSelfiePhoto(null);
    } else if (type === 'outsideHouse') {
      setOutsideHousePhoto(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 

    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!mobileNumber.match(/^\d{10}$/)) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (!residingSince) { setError('Please select residing since date.'); return; }
    if (!landmark.trim()) { setError('Please enter nearest landmark.'); return; }
    if (govtIdPhotos.length === 0) { setError('Please capture at least one Government ID photo.'); return; }
    if (!selfiePhoto) { setError('Please capture your selfie at the entrance.'); return; }
    if (!outsideHousePhoto) { setError('Please capture an outside house photo.'); return; }
    
    if (!location) {
      setError(step1Error || 'Location not available. Please ensure GPS is enabled and permissions are granted from Step 1.');
      return;
    }
    
    // Prepare all data for submission
    const submissionData = {
      // Respondent's details from Step 2 form
      fullName, 
      mobileNumber, 
      relationship, 
      residenceType, 
      residingSince, 
      landmark, // Landmark provided by respondent in Step 2
      govtIdType, 
      govtIdPhotos, 
      selfiePhoto, 
      outsideHousePhoto, 
      gpsLocation: location,

      // Candidate details from initial load (formData)
      // These are needed by the API to construct the full pdfData object
      candidateNameFromInitialData: formData?.candidateName,
      houseNoFromInitialData: formData?.houseNo,
      streetFromInitialData: formData?.street, // Add street to formData if you use it
      areaFromInitialData: formData?.area,
      landmarkFromInitialData: formData?.nearby, // Candidate's address landmark from initial data
      cityFromInitialData: formData?.city,
      stateFromInitialData: formData?.state,
      zipCodeFromInitialData: formData?.zipCode,
      countryFromInitialData: formData?.country,
      
      // If you geocoded candidate address on client (not recommended, but if you did)
      // candidateAddressCoordinates: { lat: ..., lng: ... } 
      // Better to geocode candidate address on backend using address string
    };

    setLoading(true); 
    try {
      const res = await fetch(`/api/form-links/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace('/thanks');
        return;
      } else if (res.status === 404) {
        notFound();
      } else {
        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
        console.error("Submission error:", err);
        setError('An unexpected error occurred during submission.');
    } finally {
        setLoading(false);
    }
  };

  if (!token && !loading) { 
      return <div className={styles.loadingText}>Invalid or missing verification link.</div>;
  }

  if (loading) return <div className={styles.loadingText}>Loading... Please wait.</div>;

  if (formData?.status === "submitted" || submitted) {
    return (
      <div className={styles.submittedMsg}>
        Thank you, {formData?.candidateName || fullName || "User"}! <br />
        <span className={styles.submittedMsgSub}>Your response has been submitted.</span>
      </div>
    );
  }

  if (error && !formData) {
      return <div className={styles.inputError} style={{textAlign: 'center', padding: '20px'}}>{error}</div>;
  }
  if (!formData && !loading) {
      return <div className={styles.loadingText}>Could not load form details. The link may be invalid or there was a network issue.</div>;
  }

  const addressString = formData ? [
    formData.houseNo, 
    formData.street, // If you have 'street' in your formData/DB
    formData.nearby, 
    formData.area, 
    formData.city,
    formData.state, 
    formData.zipCode, 
    formData.country
  ].filter(Boolean).join(", ") : "Address not available";

  const relationshipOptions = [
    "Self", "Father", "Mother", "Wife", "Husband", "Brother", "Sister",
    "Father In-Law", "Mother In-Law", "Brother In-Law", "Sister In-Law",
    "Relative", "Neighbour", "Security Guard", "Watchman"
  ];
  const residenceTypeOptions = ["Owned", "Rented", "Guest House", "Family Owned", "Temporary Residence"];
  const govtIdOptions = ["PAN", "Aadhaar", "DL", "Passport", "Voter ID"];

  return (
    <div className={styles.bgPage}>
      {reloaded && showReloadedWarning && (
          <div className={styles.reloadOuter}>
            <div className={styles.reloadWarning}>
              <h3 className={styles.reloadTitle}>If you refresh the page, you may need to refill data.</h3>
              <div className={styles.reloadMsg}>No draft is saved in your browser.</div>
            </div>
          </div>
        )}

      {step === 1 && (
        <>
          {/*<h1 className={styles.mainTitle}>Digital Address Verification</h1>*/}
          {/* Ensure your CSS for mainCard, imageHolder etc. is correct based on what you want here */}
          <div className={styles.mainCard}> 
            {formData?.bgImage && /* Example if you had a dynamic bg image */
                <div className={styles.imageHolder}><img src={formData.bgImage} alt="Verification Background" className={styles.originalImage} /></div>
            }
            {!formData?.bgImage && /* Fallback or default image */
                 <div className={styles.imageHolder}><img src="/assets/verify-bg.jpg" alt="Address Verification" className={styles.originalImage} draggable={false} /></div>
            }
            <div className={styles.infoCard}>
              <div className={styles.label}>Candidate</div>
              <div className={styles.value}>{formData?.candidateName || "N/A"}</div>
              <div className={styles.label}>Address</div>
              <div className={styles.valueAddress}>{addressString}</div>
            </div>

            

            <div className={styles.confirmCard}>
              <div className={styles.confirmTitle}>Are you at the above address?</div>
              <div className={styles.confirmMsg}>
                Proceed <b>ONLY</b> if you are at your home and location is acquired, else the verification may FAIL.
              </div>
              <button
                className={styles.confirmBtn}
                onClick={() => setStep(2)}
                disabled={isLocationLoading || !location || !!step1Error}
              >
                Yes, I&apos;m home. Let&apos;s proceed
              </button>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <div className={styles.bgStep2}>
          <div className={styles.step2Card}>
            <div className={styles.step2Title}>Personal & Address Verification Details</div>
            {cameraError && <div className={styles.cameraErrorMsg}>{cameraError}</div>}
            {showCamera && (
              <div className={styles.cameraOverlay}>
                <div className={styles.cameraView}>
                  <video ref={videoRef} autoPlay playsInline className={styles.videoFeed}></video>
                  <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                  {/* Group buttons for better layout */}
                  <div style={{display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: '10px'}}>
                    <button onClick={takePicture} className={styles.captureButton}>Capture Photo</button>
                    <button onClick={stopCamera} className={styles.closeCameraButton}>Close Camera</button>
                  </div>
                </div>
              </div>
            )}

            <form className={styles.step2Form} onSubmit={handleSubmit}>
              <label className={styles.inputLabel}>Your Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}  disabled={submitted} className={styles.inputField} required />

              <label className={styles.inputLabel}>Your Mobile</label>
              <div className={styles.mobileInputContainer}>
                <span className={styles.countryCode}>+91</span>
                <input type="tel" value={mobileNumber} onChange={e => { const val = e.target.value; if (/^\d*$/.test(val) && val.length <= 10) { setMobileNumber(val); }}} disabled={submitted} className={`${styles.inputField} ${styles.mobileInput}`} pattern="\d{10}" title="Please enter a 10-digit mobile number" required />
              </div>

              <label className={styles.inputLabel}>Your relation with "{formData?.candidateName || 'Candidate'}"</label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} disabled={submitted} className={styles.inputField} required>
                {relationshipOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              <label className={styles.inputLabel}>Residence Type</label>
              <select value={residenceType} onChange={e => setResidenceType(e.target.value)} disabled={submitted} className={styles.inputField} required>
                {residenceTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              <label className={styles.inputLabel}>Residing Since</label>
              <input type="date" value={residingSince} onChange={e => setResidingSince(e.target.value)} disabled={submitted} className={styles.inputField} required />

              <label className={styles.inputLabel}>Nearest Landmark to this address</label>
              <input type="text" value={landmark} onChange={e => setLandmark(e.target.value)}  disabled={submitted} className={styles.inputField} required />

              <label className={styles.inputLabel}>Govt. ID Type</label>
              <select value={govtIdType} onChange={e => setGovtIdType(e.target.value)} disabled={submitted} className={styles.inputField} required>
                {govtIdOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              <label className={styles.inputLabel}>Click a picture of your Govt. ID (Max 2)</label>
              <div className={styles.photoPreviewContainer}>
                {govtIdPhotos.map((photoSrc, index) => (
                  <div key={index} className={styles.photoPreviewItem}>
                    <img src={photoSrc} alt={`Govt ID ${index + 1}`} className={styles.photoPreviewImg} />
                    <button type="button" onClick={() => removePhoto('govtId', index)} className={styles.removePhotoButton}>Remove</button>
                  </div>
                ))}
              </div>
              {govtIdPhotos.length < 2 && (
                <button type="button" onClick={() => startCamera('govtId')} className={styles.cameraButton}>
                  <span role="img" aria-label="camera icon">📷</span> Capture Govt. ID Photo
                </button>
              )}

              <label className={styles.inputLabel}>Selfie at the Entrance of House (1 image)</label>
              <div className={styles.sampleImageContainer}><p>Sample:</p><img src="/assets/sample1.jpg" alt="Sample Selfie at Entrance" className={styles.sampleImage} /></div>
              {selfiePhoto && (
                <div className={styles.photoPreviewItem}> <img src={selfiePhoto} alt="Selfie" className={styles.photoPreviewImg} /> <button type="button" onClick={() => removePhoto('selfie')} className={styles.removePhotoButton}>Retake</button> </div>
              )}
              {!selfiePhoto && (<button type="button" onClick={() => startCamera('selfie')} className={styles.cameraButton}><span role="img" aria-label="camera icon">📷</span> Capture Selfie</button>)}

              <label className={styles.inputLabel}>Outside House Photo (1 image)</label>
              <div className={styles.sampleImageContainer}><p>Sample:</p><img src="/assets/sample2.jpg" alt="Sample Outside House" className={styles.sampleImage} /></div>
              {outsideHousePhoto && (
                <div className={styles.photoPreviewItem}><img src={outsideHousePhoto} alt="Outside House" className={styles.photoPreviewImg} /><button type="button" onClick={() => removePhoto('outsideHouse')} className={styles.removePhotoButton}>Retake</button></div>
              )}
              {!outsideHousePhoto && (<button type="button" onClick={() => startCamera('outsideHouse')} className={styles.cameraButton}><span role="img" aria-label="camera icon">📷</span> Capture Outside House Photo</button>)}
              
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

              {error && <div className={styles.inputError} style={{marginTop: '15px'}}>{error}</div>}
              {!location && !error && step1Error && <div className={styles.locationWarning} style={{marginTop: '15px'}}>{step1Error}</div>}

              <button type="submit" disabled={submitted || showCamera || !location} className={styles.submitBtn}>
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}