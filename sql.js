// C:\Users\Yash\Desktop\Trinetra\trinetra\sql.js

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function imageToBase64(filePath) {
  try {
    const absoluteFilePath = path.resolve(process.cwd(), 'public', filePath);
    if (fs.existsSync(absoluteFilePath)) {
      const imageBuffer = fs.readFileSync(absoluteFilePath);
      const extension = path.extname(absoluteFilePath).slice(1).toLowerCase();
      const validExtensions = ['png', 'jpeg', 'jpg', 'gif', 'svg'];
      if (!validExtensions.includes(extension)) {
        console.warn(`Unsupported image type for base64: ${extension} for ${absoluteFilePath}`);
        return "";
      }
      return `data:image/${extension === 'jpg' ? 'jpeg' : extension};base64,${imageBuffer.toString('base64')}`;
    }
    console.warn(`Image not found at: ${absoluteFilePath}`);
    return "";
  } catch (error) {
    console.error(`Error reading image file ${filePath}:`, error);
    return "";
  }
}

// Company logo ab top bar mein nahi, toh Page 1 par direct use nahi hoga is design mein.
// const companyLogoPath = "assets/logo.png"; 
const isoImagePath = "assets/iso.png";
const page1BannerPath = "assets/page1_banner.png";

async function generateTestPage1PDF(data, filename) {
  const na = "N/A";

  // const companyLogoBase64 = imageToBase64(companyLogoPath); // Not used in this version of Page 1
  const isoImageBase64 = imageToBase64(isoImagePath);
  const page1BannerBase64 = imageToBase64(page1BannerPath);

  const submittedAtDate = data.submittedAt ? new Date(data.submittedAt) : new Date();
  const formattedDateIST = submittedAtDate
    ? submittedAtDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
    : na;
  const formattedTimeIST = submittedAtDate
    ? submittedAtDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })
    : na;

const footerHtml = `
  <style>
    /* Basic reset for the template's rendering context */
    html, body {
        margin: 0;
        padding: 0;
        width: 100%; /* Ensure the body can be a reference for positioned elements if needed */
        height: 100%;
    }
    .custom-report-footer {
      position: fixed; /* Footer ko uske allocated space ke bottom mein fix karega */
      bottom: 0px;     /* Bilkul neeche se shuru hoga */
      left: 0px;       /* Left edge se shuru */
      right: 0px;      /* Right edge tak jayega (width: 100% ki tarah kaam karega) */
      /* ya 'width: 100%;' bhi use kar sakte hain left/right ki jagah */
      
      height: 35px;    /* Aapke footer bar ki visual height (ise adjust kar sakte hain) */
      
      background-color: #000000 !important;
      color: #ffffff !important;
      
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px; /* Text ke liye andar ki padding */
      box-sizing: border-box;
      font-size: 10px; /* Font size (aap 9px, 11px etc. kar sakte hain) */
      font-family: Arial, sans-serif;

      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
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
            color:rgb(0, 0, 0);
            -webkit-print-color-adjust: exact; /* Important for Puppeteer to print backgrounds */
          }
          .page-container {
            display: flex;
            flex-direction: column;
            width: 210mm; /* A4 width */
            height: calc(297mm - 30mm); /* A4 height minus footer margin (30mm) */
            box-sizing: border-box;
            margin: 0;
            padding: 0; /* No padding on the container itself affecting height calculation */
          }

          /* Banner Styles */
          .p1-banner-image-container {
            width: 100%;
            height: 300px;
            flex-shrink: 0; /* Prevent banner from shrinking if space is tight */
            text-align: center;
          }
          .p1-banner-image {
            width: 100%; /* Takes full width of its container */
            height: auto;  /* Maintains aspect ratio, prevents cropping/stretching */
            display: block; /* Removes extra space below inline images */
            max-height: 500px; /* Optional: Set a max-height if banner could be excessively tall. Adjust as needed. Start without if unsure. */
          }

          /* Main Content Area (for text) */
          .p1-main-content-area {
            padding: 200px 25px 15px 25px; /* Adjust padding as needed */
            flex-grow: 1; /* This area will expand to fill available space, pushing ISO images down */
            display: flex;
            flex-direction: column;
          }

          .p1-info-block {
            text-align: left;
            margin-bottom: 20px;
            font-size: 20px;
            line-height: 1.5;
            color:rgb(0, 0, 0);
          }
          .p1-info-block .candidate-name-display {
            font-size: 25px;
            font-weight: 800;
            color: #000000;
            margin-bottom: 5px;
            margin-top: 0;
          }
          .p1-info-block .info-line {
            margin-bottom: 1px;
            font-size: 15px;
            color:rgb(0, 0, 0);
          }
          .p1-info-block .info-line strong { font-weight: 500; color: #333; }

          /* Parent div ke liye common styles */
.p1-main-report-title {
    margin-bottom: 5px; /* Pure title block ke niche ka margin */
    text-align: left;   /* Text alignment */
}

/* Pehla hissa: "A Comprehensive" (Blue color) */
.comprehensive-prefix {
    display: block; /* Isko block element banata hai taki yeh apni line par aaye */
    font-size: 35px;    /* Original font size */
    font-weight: 800;   /* Original font weight */
    color: #007bff;     /* Blue color (aap apni pasand ka blue code daal sakte hain) */
    line-height: 1.2;   /* Line height */
    margin-bottom: 2px; /* Neeche wali line se thoda sa gap (adjust kar sakte hain) */
    margin-top: 10px; /* Agar upar wale se gap margin-bottom se control ho raha hai */
    }

/* Dusra hissa: "Background Verification Report" (Red color) */
.report-main-title {
    display: block; /* Isko block element banata hai taki yeh apni line par aaye */
    font-size: 35px;    /* Original font size */
    font-weight: 800;   /* Original font weight */
    color: #B71C1C;     /* Original red color (aapka pehle wala) */
    line-height: 1.2;   /* Line height */
    /* padding: 0; */  /* Agar padding chahiye toh yahan add karein */
    /* margin-top: 0; */ /* Agar upar wale se gap margin-bottom se control ho raha hai */
    margin-bottom: 30px; /* Neeche wali line se thoda sa gap (adjust kar sakte hain) */ 
}

          .p1-sub-report-title {
    display: inline-block; /* Lines ki width content ke anusaar karne ke liye */
    font-size: 18px;
    color: #333;
    margin-top: 0px;
    margin-bottom: 0px;
    text-align: left; /* Text ko inline-block ke andar left align karega */
    font-weight: 500;
    border-top: 1px solid #cccccc;
    border-bottom: 1px solid #cccccc;
    padding-top: 8px;    /* Text aur upar ki line ke beech mein spacing */
    padding-bottom: 8px; /* Text aur neeche ki line ke beech mein spacing (0px se badal diya) */
}

          /* ISO Images Container */
.p1-iso-images-container {
    text-align: left; /* Images ko left align rakhega */
    padding: 10px 0px 15px 0px; /* Container ke andar ki padding (Top, L/R, Bottom) - yeh waise hi hai */
    flex-shrink: 0; /* ISO container ko shrink hone se rokega */
    margin-top: 0px;    /* Container ke UPAR 10px ki spacing */
    margin-bottom: 0px; /* Container ke NICHE 10px ki spacing (aap ise adjust kar sakte hain) */
    margin-left: 0; /* Left margin ko 0 rakha gaya */
}

.p1-iso-image {
    max-height: 200px; /* IMAGE SIZE BADHAYA GAYA (Pehle 45px tha). Aap ise apni zaroorat ke anusaar badal sakte hain. */
    height: auto; /* Aspect ratio maintain karega */
    display: inline-block; /* Images ko ek line mein rakhne ke liye */
    margin-right: 10px; /* Images ke beech mein right margin */
    margin-left: 0; /* Left margin ko 0 rakha gaya */}

.p1-iso-image:last-child {
    margin-right: 0; /* Aakhri image ka right margin hataya gaya */
}


        </style>
      </head>
      <body>
        <div class="page-container">
            ${page1BannerBase64 ? `
                <div class="p1-banner-image-container">
                    <img src="${page1BannerBase64}" alt="Report Banner" class="p1-banner-image"/>
                </div>
            ` : '<div style="height: 150px; background-color: #f0f0f0; display:flex; align-items:center; justify-content:center; color:#aaa; margin-bottom:20px;">[Banner Image Area]</div>'}

            <div class="p1-main-content-area">
                <div class="p1-info-block">
                    <div class="candidate-name-display">${data.candidateName || na}</div>
                    <div class="info-line">Report Date : ${formattedDateIST}, ${formattedTimeIST} / Requested by : <strong>${data.requestedBy || na}</strong></div>
                </div>

                <div class="p1-main-report-title">
                  <span class="comprehensive-prefix">A Comprehensive</span>
                  <span class="report-main-title">Background Verification Report</span>
                  <div class="p1-sub-report-title">AI Based Detailed Verification Report</div>

                </div>

            <div class="p1-iso-images-container">
              ${isoImageBase64 ? `<img src="${isoImageBase64}" alt="ISO Certification" class="p1-iso-image"/>` : '<span style="font-size:9px; color: #666;">ISO Certified</span>'}
              </div>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await new Promise(resolve => setTimeout(resolve, 300)); 

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", bottom: "30mm", left: "0mm", right: "0mm" }, // Bottom margin FOR footer
    footerTemplate: footerHtml,
    displayHeaderFooter: true,
    preferCSSPageSize: true, 
  });
  await browser.close();

  const saveDir = path.resolve(process.cwd(), "test_pdfs_page1_no_header"); // New folder
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
  const filePath = path.join(saveDir, filename);
  fs.writeFileSync(filePath, pdfBuffer);
  console.log(`✅ Test PDF (Page 1, No Header) saved to: ${filePath}`);
  return filePath;
}

// --- Dummy Data for Testing Page 1 ---
const testDataPage1 = {
  candidateName: "Yash F.",
  requestedBy: "Trinetra (Test User)",
  submittedAt: new Date().toISOString(),
  // token: "DEMO001", // Not directly used on page 1 text anymore
};

// --- Output Filename for Test ---
const testFilename = `NoHeader_Page1_${testDataPage1.candidateName.replace(/[\s\W]/g, '_')}.pdf`;

// --- Run the Test PDF Generation for Page 1 ---
async function runTest() {
  console.log("🚀 Starting No-Header Page 1 PDF generation test...");
  try {
    await generateTestPage1PDF(testDataPage1, testFilename);
  } catch (error) {
    console.error("❌ Error during No-Header Page 1 PDF generation test:", error);
  }
}

runTest();