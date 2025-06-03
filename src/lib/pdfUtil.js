import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// LEGEND icons (publicly hosted Google icons, or replace with your own if needed)
const blueIcon = "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png";
const greenIcon = "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png";

// Set absolute path for sample1.jpg (works on Windows!)
const samplePhotoPath = "C:\\Users\\Yash\\Desktop\\Trinetra\\trinetra\\public\\uploads\\sample1.jpg";

export async function generatePDFAndSave(data, filename) {
  const addressString = [
    data.houseNo,
    data.nearby,
    data.area,
    data.city,
    data.state,
    data.zipCode,
    data.country
  ].filter(Boolean).join(", ");

  const bgImagePath = "/assets/verify-bg.jpg";

  // Add the hardcoded photo1 path if not already present (for testing/demo)
  // (Preferably: remove this block in production, or pass path via form/API)
  if (!data.photo1) data.photo1 = samplePhotoPath;

  // Debug file existence
  console.log("photo1 path:", data.photo1);
  console.log("Exists:", fs.existsSync(data.photo1));

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f7f8fd; padding: 0; margin: 0;}
          .header-bar { background: #b2e0ee; padding: 16px 30px; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #183062;}
          .container { padding: 32px 32px 22px 32px; }
          .flex-row { display: flex; }
          .col { flex: 1; padding-right: 28px; }
          .card { background: #fff; border-radius: 12px; padding: 18px 24px; box-shadow: 0 2px 12px #f0f2fa; }
          .section-title { font-size: 17px; font-weight: bold; margin-bottom: 12px; color: #183062;}
          .label { color: #b4b7c9; font-weight: 600; font-size: 14px; }
          .value { color: #2d384c; font-weight: 600; font-size: 15px; margin-bottom: 12px; }
          .address { color: #344768; font-weight: 500; font-size: 14px; line-height: 1.4; margin-bottom: 18px;}
          .verified { color: green; font-weight: bold; font-size: 15px; margin: 12px 0;}
          .photos { margin: 18px 0 0 0; display: flex; gap: 12px; }
          .photos img { border-radius: 5px; width: 115px; height: 85px; object-fit: cover; border: 1px solid #eee; }
          .map-section { margin-top: 24px;}
          .legend-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 14px;}
          .legend-table th, .legend-table td { border: 1px solid #ddd; padding: 7px 12px; text-align: left;}
          .legend-table th { background: #f2f7fd; color: #183062;}
          .legend-table td img { vertical-align: middle; }
        </style>
      </head>
      <body>
        <div class="header-bar">PERMANENT ADDRESS</div>
        <div class="container">

          <div class="flex-row">
            <div class="col" style="max-width:260px">
              <div class="section-title">Permanent Address</div>
              <div class="label">Candidate</div>
              <div class="value">${data.candidateName || ""}</div>
              <div class="label">Address</div>
              <div class="address">${addressString}</div>
              <div class="verified">✔ Verified</div>
            </div>
            <div class="col">
              <div class="section-title">Report</div>
              <div class="label">Verification Type</div>
              <div class="value">${data.verificationType || "Digital verification"}</div>
              <div class="label">Verifier Name</div>
              <div class="value">${data.verifierName || ""}</div>
              <div class="label">Relationship</div>
              <div class="value">${data.relationship || ""}</div>
              <div class="label">Residence Type</div>
              <div class="value">${data.residenceType || ""}</div>
              <div class="label">Residing Since</div>
              <div class="value">${data.residingSince || ""}</div>
              <div class="label">Date of Verification</div>
              <div class="value">${data.submittedAt || ""}</div>
            </div>
          </div>
          
          <div style="margin-top:24px;">
            <div class="section-title">Photos</div>
            <div class="photos">
              ${data.verifierIdPhoto && fs.existsSync(data.verifierIdPhoto) ? `<img src="file://${data.verifierIdPhoto}" alt="Verifier ID" />` : ""}
              ${data.photo1 && fs.existsSync(data.photo1) ? `<img src="file://${data.photo1}" alt="Photo1"/>` : ""}
              ${data.photo2 && fs.existsSync(data.photo2) ? `<img src="file://${data.photo2}" alt="Photo2"/>` : ""}
              ${data.photo3 && fs.existsSync(data.photo3) ? `<img src="file://${data.photo3}" alt="Photo3"/>` : ""}
            </div>
          </div>

          <div class="map-section">
            <div class="section-title" style="margin-bottom: 7px;">Location Map</div>
            <img src="${data.staticMapUrl}" style="width:100%;max-width:520px;border-radius:8px;border:1px solid #eee;" alt="Map" />

            <table class="legend-table">
              <tr>
                <th>Legend</th>
                <th>Address Source</th>
                <th>Latitude, Longitude</th>
              </tr>
              <tr>
                <td><img src="${blueIcon}" width="20" /> S</td>
                <td>Input Address</td>
                <td>${data.addressCoords?.lat || ""}, ${data.addressCoords?.lng || ""}</td>
              </tr>
              <tr>
                <td><img src="${greenIcon}" width="20" /> G</td>
                <td>GPS</td>
                <td>${data.gpsLocation?.lat || ""}, ${data.gpsLocation?.lng || ""}</td>
              </tr>
            </table>
          </div>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  await page.evaluateHandle('document.fonts.ready');
  await new Promise(res => setTimeout(res, 250)); // slightly longer for remote images

  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  const saveDir = path.resolve(process.cwd(), "public", "pdfs");
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
  const filePath = path.join(saveDir, filename);

  fs.writeFileSync(filePath, pdfBuffer);

  return `/pdfs/${filename}`;
}
