"use client";
import React, { useState, useEffect } from "react";

const GOOGLE_STATIC_MAPS_API = "https://maps.googleapis.com/maps/api/staticmap";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // .env file me set karo
console.log("GOOGLE_MAPS_API_KEY from env:", GOOGLE_MAPS_API_KEY);

function getGoogleStaticMapUrl(lat, lng) {
  return `${GOOGLE_STATIC_MAPS_API}?center=${lat},${lng}&zoom=18&size=600x400&markers=color:red%7C${lat},${lng}&key=${GOOGLE_API_KEY}`;
}

export default function AVFFormPage({ params }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    relation: "",
    residenceType: "",
    residingSince: "",
    landmark: "",
    govIdType: "",
    govIdDocs: [],
    selfie: [],
    outsidePhoto: [],
    location: null,
    mapUrl: "",
  });
  const [canProceed, setCanProceed] = useState(false);
  const [locError, setLocError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 1️⃣ Load link details
  useEffect(() => {
    fetch(`/api/avf/${params.token}`)
      .then(r => r.status === 404 ? Promise.reject() : r.json())
      .then(data => {
        setForm(data.formLink);
        setFormData(f => ({
          ...f,
          name: data.formLink.candidateName || "",
          address: [
            data.formLink.houseNo, data.formLink.area,
            data.formLink.city, data.formLink.state, data.formLink.country
          ].filter(Boolean).join(", ")
        }));
      })
      .catch(() => setExpired(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  // 2️⃣ Location verification logic
  const verifyLocation = async () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError("Your browser doesn't support geolocation");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;

        // Mark clicked
        await fetch(`/api/avf/mark-clicked`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formId: form?.id }),
        });

        // Google Maps URL
        const mapUrl = getGoogleStaticMapUrl(latitude, longitude);

        // Compare address & user location
        try {
          const res = await fetch(`/api/avf/check-location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: formData.address, userLat: latitude, userLng: longitude }),
          });
          const { matched, distance, error } = await res.json();
          if (error) setLocError(error);
          else if (matched) {
            setCanProceed(true);
            setFormData(f => ({
              ...f, location: { latitude, longitude }, mapUrl
            }));
          }
          else setLocError(`You’re ${distance}m away from the provided address.`);
        } catch (err) {
          setLocError("Location verification failed. Try again.");
        }
      },
      () => setLocError("Location permission denied. Allow it to proceed!")
    );
  };

  // Only allow on mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) setExpired(true);
    }
  }, []);

  // File handling
  const handleFileCapture = (e, field, maxFiles = 1) => {
    const files = Array.from(e.target.files).slice(0, maxFiles);
    setFormData(f => ({ ...f, [field]: files }));
  };

  // 3️⃣ Final submit
  const handleFinalSubmit = async e => {
    e.preventDefault();
    setLocError('');
    try {
      const payload = new FormData();
      payload.append("formId", form.id);
      [
        "name", "number", "relation", "residenceType", "residingSince",
        "landmark", "govIdType"
      ].forEach(key => payload.append(key, formData[key]));
      payload.append("latitude", formData.location.latitude);
      payload.append("longitude", formData.location.longitude);
      payload.append("mapUrl", formData.mapUrl);

      formData.govIdDocs.forEach(file => payload.append("govIdDocs", file));
      formData.selfie.forEach(file => payload.append("selfie", file));
      formData.outsidePhoto.forEach(file => payload.append("outsidePhoto", file));

      const res = await fetch(`/api/avf/submit`, {
        method: "POST",
        body: payload,
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch (err) {
      setLocError(err.message);
    }
  };

  // UX States
  if (loading) return <p>Loading…</p>;
  if (expired) return (
    <h3 className="expired">
      Link expired or invalid, or you are not on a mobile device.
    </h3>
  );
  if (submitted) return (
    <div className="thank-you">
      <h3>Thank you for submitting the form!</h3>
      <p>Your response has been recorded.</p>
    </div>
  );

  return (
    <div className="avf-form-container">
      {step === 1 && (
        <>
          <div className="avf-header bg-image" style={{
            backgroundImage: `url('/assets/verify-bg.jpg')`
          }}/>
          <div className="info-box">
            <p><b>Candidate:</b> {form.candidateName}</p>
            <p><b>Address:</b> {formData.address}</p>
          </div>
          <div className="prompt-box">
            <p>Are you at the above address?</p>
            <p className="small-text">
              Proceed ONLY if you are at your home, else verification may FAIL.
            </p>
            <button onClick={verifyLocation} className="verify-btn">
              Yes, I'm home. Let's proceed
            </button>
            {locError && <p className="error">{locError}</p>}
          </div>
          {canProceed && (
            <button onClick={() => setStep(2)} className="next-btn">
              Next → Enter details
            </button>
          )}
        </>
      )}

      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="step2-form">
          <h3>Please enter the below details</h3>

          <label>
            Your Full Name
            <input type="text" placeholder="Enter your full name"
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              required />
          </label>

          <label>
            Your Mobile Number
            <input type="text" placeholder="XXXXXXXXXX"
              maxLength={10} pattern="\d{10}"
              value={formData.number}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, "");
                setFormData(f => ({ ...f, number: digits }));
              }}
              required />
            <small className="notice">
              Please enter 10 digits only, without +91 or any characters.
            </small>
          </label>

          <label>
            Your relation with the candidate
            <select value={formData.relation}
              onChange={e => setFormData(f => ({ ...f, relation: e.target.value }))}
              required>
              <option value="">Select relation</option>
              {/* all options... */}
              <option>Self</option>
              <option>Father</option>
              <option>Mother</option>
              <option>Wife</option>
              <option>Husband</option>
              <option>Brother</option>
              <option>Sister</option>
              <option>Father In-Law</option>
              <option>Mother In-Law</option>
              <option>Brother In-Law</option>
              <option>Sister In-Law</option>
              <option>Relative</option>
              <option>Neighbour</option>
              <option>Security Guard</option>
              <option>Watchman</option>
            </select>
          </label>

          <label>
            Residence Type
            <select value={formData.residenceType}
              onChange={e => setFormData(f => ({ ...f, residenceType: e.target.value }))}
              required>
              <option value="">Select residence type</option>
              <option>Owned</option>
              <option>Rented</option>
              <option>Guest House</option>
              <option>Family Owned</option>
              <option>Temporary Residence</option>
            </select>
          </label>

          <label>
            Residing Since
            <input type="date"
              value={formData.residingSince}
              onChange={e => setFormData(f => ({ ...f, residingSince: e.target.value }))}
              required />
          </label>

          <label>
            Nearest Landmark
            <input placeholder="Enter the landmark"
              value={formData.landmark}
              onChange={e => setFormData(f => ({ ...f, landmark: e.target.value }))}
              required />
          </label>

          <label>
            Govt. ID Type
            <select value={formData.govIdType}
              onChange={e => setFormData(f => ({ ...f, govIdType: e.target.value, govIdDocs: [] }))}
              required>
              <option value="">Select ID Type</option>
              <option value="PAN">PAN</option>
              <option value="Aadhaar">Aadhaar</option>
              <option value="DL">Driving License</option>
              <option value="Passport">Passport</option>
              <option value="Voter ID">Voter ID</option>
              <option value="Other">Other</option>
            </select>
          </label>

          {formData.govIdType === "Other" && (
            <label>
              Enter document name
              <input type="text"
                placeholder="Document Name"
                onChange={e => setFormData(f => ({ ...f, govIdType: e.target.value }))}
                required />
            </label>
          )}

          {formData.govIdType && (
            <label>
              Upload {formData.govIdType} ({formData.govIdDocs.length}/2)
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => handleFileCapture(e, "govIdDocs", 2)}
                required
              />
            </label>
          )}

          <div className="preview-gallery">
            {formData.govIdDocs.map((file, idx) => (
              <img key={idx} src={URL.createObjectURL(file)} alt={`ID ${idx + 1}`} />
            ))}
          </div>

          <label>
            Selfie at the Entrance of House
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={e => handleFileCapture(e, "selfie")}
              required
            />
          </label>
          <div className="preview-single">
            {formData.selfie.map((file, i) => (
              <img key={i} src={URL.createObjectURL(file)} alt="Selfie" />
            ))}
          </div>
          <small>Sample:</small>
          <img className="sample" src="/assets/sample-selfie.png" alt="Sample Selfie" />

          <label>
            Outside House Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => handleFileCapture(e, "outsidePhoto")}
              required
            />
          </label>
          <div className="preview-single">
            {formData.outsidePhoto.map((file, i) => (
              <img key={i} src={URL.createObjectURL(file)} alt="Outside" />
            ))}
          </div>
          <small>Sample:</small>
          <img className="sample" src="/assets/sample-outside.png" alt="Sample Outside" />

          {locError && <p className="error">{locError}</p>}
          <button type="submit" className="submit-btn">
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
