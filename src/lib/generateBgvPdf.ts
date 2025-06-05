// src/lib/generateBgvPdf.ts

import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

export interface BGVFormData {
  personalDetails: {
    fullName: string;
    fatherName: string;
    spouseName?: string;
    dob: string;
    gender: string;
    maritalStatus: string;
    nationality: string;
    email: string;
    mobile: string;
    passportPhotoUrl?: string;
  };
  addressVerification?: any; // fill as needed
  educationVerification?: any[];
  employmentVerification?: any[];
  authorization?: any;
}

// -- HTML Template (Use your sample as a base, you can customize further)
function getBgvHtml(data: BGVFormData) {
  return `
    <html>
      <head>
        <title>BGV Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; }
          .section { margin-bottom: 32px; }
          .title { font-weight: bold; font-size: 18px; margin-bottom: 10px;}
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #999; padding: 6px 8px; }
          .photo { float: right; width: 90px; height: 110px; object-fit: cover; border: 1px solid #888; }
        </style>
      </head>
      <body>
        <div class="section">
          <div class="title">Personal Details</div>
          <table>
            <tr>
              <td><b>Full Name</b></td>
              <td>${data.personalDetails.fullName}</td>
              <td rowspan="6">
                ${data.personalDetails.passportPhotoUrl ? `<img class="photo" src="${data.personalDetails.passportPhotoUrl}" />` : ''}
              </td>
            </tr>
            <tr><td><b>Father's Name</b></td><td>${data.personalDetails.fatherName}</td></tr>
            <tr><td><b>Spouse's Name</b></td><td>${data.personalDetails.spouseName || ""}</td></tr>
            <tr><td><b>Date of Birth</b></td><td>${data.personalDetails.dob}</td></tr>
            <tr><td><b>Gender</b></td><td>${data.personalDetails.gender}</td></tr>
            <tr><td><b>Marital Status</b></td><td>${data.personalDetails.maritalStatus}</td></tr>
            <tr><td><b>Nationality</b></td><td>${data.personalDetails.nationality}</td></tr>
            <tr><td><b>Email</b></td><td>${data.personalDetails.email}</td></tr>
            <tr><td><b>Mobile</b></td><td>${data.personalDetails.mobile}</td></tr>
          </table>
        </div>
        <!-- Similar sections for address, education, employment, etc. -->
        <div class="section">
          <div class="title">Signature</div>
          ${
            data.authorization?.signatureImageUrl
              ? `<img src="${data.authorization.signatureImageUrl}" style="width:120px; border:1px solid #333;" />`
              : `<span style="color:#999">Not provided</span>`
          }
        </div>
      </body>
    </html>
  `;
}

export async function generateBgvPdf(data: BGVFormData, pdfFilePath: string): Promise<string> {
  // 1. Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    // For Vercel/Serverless, add extra args (see below)
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // 2. HTML
  const html = getBgvHtml(data);

  // 3. Set content & wait for images to load
  await page.setContent(html, { waitUntil: "networkidle0" });

  // 4. PDF file path
  await fs.mkdir(path.dirname(pdfFilePath), { recursive: true });

  // 5. Generate PDF
  await page.pdf({
    path: pdfFilePath,
    format: "A4",
    printBackground: true,
    margin: { top: "32px", bottom: "32px", left: "24px", right: "24px" },
  });

  await browser.close();

  return pdfFilePath;
}
