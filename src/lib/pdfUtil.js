// C:\Users\Yash\Desktop\Trinetra\trinetra\src\lib\pdfUtil.js
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// --- Helper to convert local image to Base64 Data URL ---
function imageToBase64(filePath) {
  try {
    const absoluteFilePath = path.resolve(process.cwd(), filePath.startsWith('public') ? filePath : `public/${filePath}`);
    if (fs.existsSync(absoluteFilePath)) {
      const imageBuffer = fs.readFileSync(absoluteFilePath);
      const extension = path.extname(absoluteFilePath).slice(1).toLowerCase();
      const validExtensions = ['png', 'jpeg', 'jpg', 'gif', 'svg'];
      const mimeExtension = extension === 'jpg' ? 'jpeg' : extension;

      if (!validExtensions.includes(extension)) {
        console.warn(`Unsupported image type for base64: ${extension} for ${absoluteFilePath}`);
        return ""; 
      }
      return `data:image/${mimeExtension};base64,${imageBuffer.toString('base64')}`;
    }
    console.warn(`Image not found at: ${absoluteFilePath} (for PDF generation)`);
    return ""; 
  } catch (error) {
    console.error(`Error reading image file ${filePath}:`, error);
    return "";
  }
}

// Paths for images
const blueIcon = "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png";
const greenIcon = "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png";

const page1BannerPath = "assets/page1_banner.png"; // For Page 1 sql.js design
const isoImagePath = "assets/iso.png";       // For Page 1 sql.js design
const logoPath = "assets/logo.png";         // For other pages if needed by original pdfUtil.js design (not used in new Page 1)


export async function generatePDFAndSave(data, filename) {
  const na = "N/A";

  // --- Prepare Base64 images ---
  const page1BannerBase64 = imageToBase64(page1BannerPath);
  const isoImageBase64 = imageToBase64(isoImagePath); // Used by new Page 1
  const logoBase64 = imageToBase64(logoPath); // Available if other pages from pdfUtil.js need it

  // --- Date & Time formatting ---
  // For Page 1 (as per sql.js image_6e6b96.png)
  const submittedAtDatePage1 = data.submittedAt ? new Date(data.submittedAt) : new Date(); // Fallback to now if not provided
  const formattedDatePage1 = submittedAtDatePage1
    .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTimePage1 = submittedAtDatePage1
    .toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

  // For other pages (original pdfUtil.js formatting)
  const submittedAtDateForOtherPages = data.submittedAt ? new Date(data.submittedAt) : null;
  const formattedDateISTForOtherPages = submittedAtDateForOtherPages 
    ? submittedAtDateForOtherPages.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }) 
    : na;
  const formattedTimeISTForOtherPages = submittedAtDateForOtherPages 
    ? submittedAtDateForOtherPages.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) 
    : na;
  
  const candidateAddressString = [
    data.houseNo, data.street, data.area, data.landmarkForAddress,
    data.city, data.state, data.zipCode, data.country,
  ].filter(Boolean).join(", ");

  const govtIdPhoto1Src = data.govtIdPhotos && data.govtIdPhotos[0] ? data.govtIdPhotos[0] : "";
  const govtIdPhoto2Src = data.govtIdPhotos && data.govtIdPhotos[1] ? data.govtIdPhotos[1] : "";
  const selfiePhotoSrc = data.selfiePhoto || "";
  const outsideHousePhotoSrc = data.outsideHousePhoto || "";

  const footerHtml = `
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
      .custom-report-footer {
        position: fixed; bottom: 0px; left: 0px; right: 0px; height: 35px;
        background-color: #000000 !important; color: #ffffff !important;
        display: flex; justify-content: space-between; align-items: center;
        padding: 0 20px; box-sizing: border-box; font-size: 10px; font-family: Arial, sans-serif;
        -webkit-print-color-adjust: exact !important; color-adjust: exact !important;
      }
    </style>
    <div class="custom-report-footer">
      <span class="footer-text-left">Confidential document. Please do not share / Verification report of ${data.candidateName || 'Candidate'}</span>
      <span class="footer-text-right">www.trinetrathirdeye.co.in</span>
    </div>
  `;

  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
          body { 
            font-family: 'Roboto', Arial, sans-serif; 
            background: #ffffff;
            margin: 0; 
            padding: 0; 
            color: #333333; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          /* Container for Page 1 (sql.js layout) - takes full printable area, no internal padding */
          .page-container-sql-p1 {
            display: flex;
            flex-direction: column;
            width: 100%; /* Full width of printable area */
            height: 100%; /* Full height of printable area for one page */
            box-sizing: border-box;
            margin: 0;
            padding: 0; /* sql.js Page 1 container had no padding, children handled it */
            background: #ffffff; /* Ensure white background */
          }
          /* Default container for other pages (pdfUtil.js layout) */
          .page-container {
            padding: 40px; /* Uniform padding FOR CONTENT within PDF margins for pages 2+ */
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            min-height: calc(297mm - 20px - 50px - 80px); /* Approx A4 height - top/bottom PDF margin - top/bottom padding */
          }
          .page-break { 
            page-break-after: always; display:block; visibility: hidden; 
            height:0; font-size:0; line-height:0;
          }

          /* --- STYLES FOR PAGE 1 (from sql.js, adjusted) --- */
          .p1-banner-image-container {
            width: 100%;
            height: 500px; /* As in sql.js */
            flex-shrink: 0;
            text-align: center;
            background-color: #f0f0f0; /* Fallback BG */
          }
          .p1-banner-image {
            width: 100%;
            height: 100%;
            object-fit: cover; 
            display: block;
          }
          .p1-main-content-area { /* Content below banner on Page 1 */
            padding: 20px 25px 15px 25px; /* Original sql.js had 200px top, reduced for better flow */
            flex-grow: 1; 
            display: flex;
            flex-direction: column;
          }
          .p1-info-block { /* Info: Candidate, Date, Requested by */
            text-align: left;
            margin-bottom: 20px;
            font-size: 20px; /* Slightly smaller than sql.js's 15px for info-line, closer to pdfUtil's 11px */
            line-height: 1.5;
            color:rgb(0, 0, 0);
          }
          .p1-info-block .candidate-name-display {
            font-size: 25px; /* sql.js was 25px, adjusted */
            font-weight: 800; /* sql.js was 800 */
            color: #000000;
            margin-bottom: 5px;
            margin-top: 0;
          }
          .p1-info-block .info-line {
            margin-bottom: 1px;
            font-size: 14px; /* Matching parent .p1-info-block */
            color:rgb(0, 0, 0);
          }
          .p1-info-block .info-line strong { font-weight: 500; color: #333; }

          .p1-main-report-title-wrapper { /* Wrapper for the two-part title */
            margin-bottom: 5px;
            text-align: left;
            margin-top: 10px; /* Space above title */
          }
          .comprehensive-prefix {
            display: block;
            font-size: 35px; /* sql.js was 35px, adjusted */
            font-weight: 800; /* sql.js was 800 */
            color: #007bff; 
            line-height: 1.2; 
            margin-bottom: 2px;
          }
          .report-main-title-text {
            display: block;
            font-size: 35px; /* sql.js was 35px, adjusted */
            font-weight: 700; /* sql.js was 800 */
            color: #B71C1C; 
            line-height: 1.2; 
            margin-bottom: 30px; /* sql.js was 30px */
          }
          .p1-sub-report-title-sql { /* "AI Based Detailed..." title */
            display: inline-block; 
            font-size: 18px; /* sql.js was 18px */
            color: #333;
            margin: 8px 0 25px 0; /* Top/Bottom margin */
            text-align: left; 
            font-weight: 500;
            border-top: 1px solid #cccccc;
            border-bottom: 1px solid #cccccc;
            padding-top: 8px;
            padding-bottom: 8px;
          }
          .p1-iso-images-container-sql {
            text-align: left;
            padding: 10px 0px 15px 0px;
            flex-shrink: 0; 
            margin-top: 0px; /* Push to bottom of .p1-main-content-area */
          }
          .p1-iso-image-sql {
            max-height: 200px; /* sql.js had 200px (too big), image_6e6b96.png shows larger ISOs */
            height: auto; 
            display: inline-block; 
            margin-right: 10px;
            margin-top: 0px;
          }
          .p1-iso-image-sql:last-child { margin-right: 0; }
          /* --- END OF STYLES FOR PAGE 1 --- */

          /* --- STYLES FOR PAGE 2 ONWARDS (from pdfUtil.js) --- */
          .p2-title { font-size: 20px; font-weight: 700; color: #183062; margin-bottom: 20px; text-align:left; border-bottom: 2px solid #183062; padding-bottom: 5px;}
          .p2-summary-text { font-size: 12px; line-height: 1.7; margin-bottom: 25px; text-align:left; }
          /* ... (all other styles from pdfUtil.js for Page 2,3,4,5 like .content-card, .main-content-title etc. remain here) ... */
          .p2-verified-section { display: flex; align-items: center; margin-bottom: 20px; text-align:left; }
          .p2-verified-icon { font-size: 20px; color: #4CAF50; margin-right: 10px; } 
          .p2-verified-text { font-size: 16px; font-weight: bold; color: #4CAF50; }
          .p2-separator-line { border: 0; border-top: 1px solid #cccccc; margin: 25px 0; }
          .p2-disclaimer-text { font-size: 10px; line-height: 1.6; color: #555555; text-align: justify; }
          .p2-disclaimer-text p { margin-bottom: 10px; }
          
          .content-card { background: #fff; border-radius: 6px; padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.07); margin-bottom:20px; border: 1px solid #e0e6ed; }
          .main-content-title { font-size: 20px; font-weight: 700; color: #183062; margin-bottom: 25px; text-align:left; border-bottom: 2px solid #183062; padding-bottom: 5px; }
          .section-title { font-size: 15px; font-weight: bold; margin-bottom: 12px; color: #183062; border-bottom: 1px solid #e9ecef; padding-bottom: 6px;}
          .flex-container { display: flex; flex-wrap: wrap; margin-bottom: 8px; }
          .flex-col { flex: 1 1 48%; min-width: 220px; padding-right: 12px; box-sizing: border-box; margin-bottom: 8px; }
          .flex-col:last-child { padding-right: 0; }
          .label { color: #495057; font-weight: 500; font-size: 12px; margin-bottom: 2px; }
          .value { color: #212529; font-weight: 500; font-size: 13px; margin-bottom: 10px; word-break: break-word; }
          .address-value { color: #212529; font-size: 13px; line-height: 1.5; margin-bottom: 8px;}

          .photos-grid { display: flex; flex-wrap: wrap; gap: 12px; }
          .photo-item { flex: 0 0 calc(50% - 12px); max-width: calc(50% - 12px); border: 1px solid #dee2e6; border-radius: 4px; padding: 6px; text-align: center; box-sizing: border-box; }
          .photo-item img { max-width: 100%; height: 180px; object-fit: contain; border-radius: 3px; margin-bottom: 4px; }
          .photo-item .label { font-size: 11px; color: #333; font-weight: 500; }

          .map-image { width:100%; max-width:100%; height: auto; border-radius:6px; border:1px solid #dee2e6; margin-bottom: 10px; }
          .legend-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px;}
          .legend-table th, .legend-table td { border: 1px solid #ced4da; padding: 6px 8px; text-align: left;}
          .legend-table th { background: #e9ecef; color: #0d2c54; font-weight: bold;}
          .legend-table td img { vertical-align: middle; width: 12px; height: 12px; margin-right: 4px; }
        </style>
      </head>
      <body>
        <div class="page-container-sql-p1">
            ${page1BannerBase64 ? `
                <div class="p1-banner-image-container">
                    <img src="${page1BannerBase64}" alt="Report Banner" class="p1-banner-image"/>
                </div>
            ` : '<div style="height: 300px; background-color: #f0f0f0; display:flex; align-items:center; justify-content:center; color:#aaa;">[Banner Placeholder]</div>'}

            <div class="p1-main-content-area">
                <div class="p1-info-block">
                    <div class="candidate-name-display">${data.candidateName || na}</div>
                    <div class="info-line">Report Date : ${formattedDatePage1}, ${formattedTimePage1} / Requested by : <strong>${data.requestedBy || na}</strong></div>
                </div>

                <div class="p1-main-report-title-wrapper">
                    <span class="comprehensive-prefix">A Comprehensive</span>
                    <span class="report-main-title-text">Background Verification Report</span>
                    <div class="p1-sub-report-title-sql">AI Based Detailed Verification Report</div>
                </div>

                <div class="p1-iso-images-container-sql">
  ${isoImageBase64 ? `<img src="${isoImageBase64}" alt="ISO Certification" class="p1-iso-image-sql"/>` : ''}
  </div>
            </div>
        </div>
        <div class="page-break"></div>

        <div class="page-container">
          <div class="p2-title">VERIFICATION REPORT </div>
          <p class="p2-summary-text">
            Trinetra III Eye Private Limited. successfully completed the digital address verification, and below is the summary, followed by details report.
          </p>
          <div class="p2-verified-section">
            <span class="p2-verified-icon">✔</span>
            <span class="p2-verified-text">| verified</span>
          </div>
          <hr class="p2-separator-line"/>
          <div class="p2-disclaimer-text">
            <p>Our reports and comments are confidential in nature and are meant solely for the internal use of the client to make an assessment of the background of the applicant. They are not intended for publication, circulation, or sharing with any other person, including the applicant, nor are they to be reproduced or used for any other purpose, in whole or in part, without the prior written consent of Trinetra III Eye Private Limited in each specific instance.</p>
            <p>This report is based on information gathered from various sources that was made available to the Trinetra III Eye Private Limited team during the verification process and should not be considered as a definitive pronouncement on the individual(s) whose background was sought to be verified. Trinetra III Eye Private Limited has no responsibility to update its findings for events or circumstances occurring after the date of this report, unless specifically requested to do so.</p>
          </div>
        </div>
        <div class="page-break"></div>

        <div class="page-container">
          <div class="main-content-title">VERIFIED DETAILS |</div>
          <div class="content-card">
            <div class="section-title">Candidate & Address Details</div>
            <div class="flex-container">
              <div class="flex-col">
                <div class="label">Candidate Name:</div>
                <div class="value">${data.candidateName || na}</div>
              </div>
              <div class="flex-col">
                <div class="label">Full Address (as provided):</div>
                <div class="address-value">${candidateAddressString || na}</div>
              </div>
            </div>
          </div>
          <div class="content-card">
            <div class="section-title">Verification Respondent Details</div>
            <div class="flex-container">
              <div class="flex-col">
                <div class="label">Respondent Full Name:</div>
                <div class="value">${data.verifierName || data.fullName || na}</div>
                <div class="label">Mobile Number:</div>
                <div class="value">${data.mobileNumber || na}</div>
                <div class="label">Relationship with Candidate:</div>
                <div class="value">${data.relationship || na}</div>
              </div>
              <div class="flex-col">
                <div class="label">Residence Type:</div>
                <div class="value">${data.residenceType || na}</div>
                <div class="label">Residing Since:</div>
                <div class="value">${data.residingSince ? new Date(data.residingSince).toLocaleDateString('en-GB') : na}</div>
                <div class="label">Nearest Landmark (by respondent):</div>
                <div class="value">${data.landmark || na}</div>
              </div>
            </div>
          </div>
          <div class="content-card">
            <div class="section-title">Verification Meta</div>
            <div class="flex-container">
                <div class="flex-col">
                    <div class="label">Verification Type:</div>
                    <div class="value">${data.verificationType || data.formType || "Digital Verification"}</div>
                    <div class="label">Government ID Type (by respondent):</div>
                    <div class="value">${data.govtIdType || na}</div>
                </div>
                <div class="flex-col">
                    <div class="label">Date & Time of Verification (IST):</div>
                    <div class="value">${formattedDateISTForOtherPages}, ${formattedTimeISTForOtherPages}</div>
                </div>
            </div>
          </div>
        </div>
        <div class="page-break"></div>

        <div class="page-container">
            <div class="main-content-title">CAPTURED EVIDENCES |</div>
            <div class="photos-section content-card">
                <div class="photos-grid">
                    ${govtIdPhoto1Src ? `<div class="photo-item"><div class="label">Government ID (1)</div><img src="${govtIdPhoto1Src}" alt="Govt ID 1"/></div>` : ""}
                    ${govtIdPhoto2Src ? `<div class="photo-item"><div class="label">Government ID (2)</div><img src="${govtIdPhoto2Src}" alt="Govt ID 2"/></div>` : ""}
                    ${selfiePhotoSrc ? `<div class="photo-item"><div class="label">Selfie at Entrance</div><img src="${selfiePhotoSrc}" alt="Selfie"/></div>` : ""}
                    ${outsideHousePhotoSrc ? `<div class="photo-item"><div class="label">Outside House Photo</div><img src="${outsideHousePhotoSrc}" alt="Outside House"/></div>` : ""}
                </div>
                ${!(govtIdPhoto1Src || govtIdPhoto2Src || selfiePhotoSrc || outsideHousePhotoSrc) ? '<div class="value" style="text-align:center; padding: 10px;">No photos were submitted or available.</div>' : ''}
            </div>
        </div>
        <div class="page-break"></div>
        
        <div class="page-container">
            <div class="main-content-title">LOCATION VERIFICATION MAP </div>
            <div class="map-section content-card">
                ${data.staticMapUrl ? `<img src="${data.staticMapUrl}" class="map-image" alt="Location Map" />` : '<div class="value" style="text-align:center; padding: 10px;">Map image not available.</div>'}
                <table class="legend-table">
                    <thead>
                        <tr>
                            <th>Legend</th>
                            <th>Address Source</th>
                            <th>Latitude, Longitude</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><img src="${blueIcon}" alt="Blue Icon"/> Candidate Address</td>
                            <td>Provided Address</td>
                            <td>${data.addressCoords?.lat ? `${data.addressCoords.lat.toFixed(5)}, ${data.addressCoords.lng.toFixed(5)}` : na}</td>
                        </tr>
                        <tr>
                            <td><img src="${greenIcon}" alt="Green Icon"/> GPS Location</td>
                            <td>Respondent's Location</td>
                            <td>${data.gpsLocation?.lat ? `${data.gpsLocation.lat.toFixed(5)}, ${data.gpsLocation.lng.toFixed(5)}` : na}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" }); 

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "0px", 
      bottom: "50px", // Ample space for 35px footer + breathing room
      left: "0px",
      right: "0px"
    },
    footerTemplate: footerHtml,
    displayHeaderFooter: true,
  });
  await browser.close();

  const saveDir = path.resolve(process.cwd(), "public", "pdfs");
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
  const filePath = path.join(saveDir, filename);
  fs.writeFileSync(filePath, pdfBuffer);
  return `/pdfs/${filename}`;
}


// --- Example Test Function (Uncomment to run with appropriate test data) ---

//const testDataForPdfUtil = {
  //candidateName: "Yash F Merged Final",
 // requestedBy: "Trinetra Test Final",
  //submittedAt: new Date().toISOString(),
  // --- Data for Page 1 (sql.js part) ---
  // page1BannerBase64 will be generated from page1BannerPath
  // isoImageBase64 will be generated from isoImagePath

  // --- Data for Page 2,3,4,5 (pdfUtil.js part) ---
  //houseNo: "H-ABC", street: "Test Street", area: "Test Area", city: "Test City", state: "Test State", zipCode: "000000", country: "Test Country",
 // verifierName: "Self Test", fullName: "Self Test Full", mobileNumber: "1234567890",
  //relationship: "Self", residenceType: "Owned by Family", residingSince: new Date(2000,0,1).toISOString(), landmark: "Near Test Landmark",
  //verificationType: "Digital Address Verification Test", govtIdType: "Test ID",
   //For photos, provide actual base64 strings or ensure imageToBase64 can resolve paths to your test images
  // govtIdPhotos: [imageToBase64("assets/sample_id1.png"), imageToBase64("assets/sample_id2.png")],
   //selfiePhoto: imageToBase64("assets/sample_selfie.png"),
   //outsideHousePhoto: imageToBase64("assets/sample_house.png"),
  //staticMapUrl: imageToBase64("assets/sample_map.png"), // Or a direct URL to a map image
 // addressCoords: { lat: 23.0225, lng: 72.5714 }, // Example: Ahmedabad
  //gpsLocation: { lat: 23.0230, lng: 72.5718 },
//};

/*async function runPdfUtilTest() {
  console.log("🚀 Starting pdfUtil.js PDF generation test (SQL.js Page 1 Design - Final)...");
  try {
const outputPath = await generatePDFAndSave(testDataForPdfUtil, `_PDF_Development_Preview.pdf`); // Fixed name
    console.log(`✅ pdfUtil.js (SQL.js Page 1 Final) Test PDF saved to: public${outputPath}`);
  } catch (error) {
    console.error("❌ Error during pdfUtil.js (SQL.js Page 1 Final) PDF generation test:", error);
  }
}*/

//runPdfUtilTest();
