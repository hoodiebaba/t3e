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
function getBgvHtml(data: any) {
  // Helper to render document links
  const renderDocs = (docs?: any[]) => {
    if (!docs || docs.length === 0) return `<i>No document uploaded</i>`;
    return `<ul>${docs.map((d: any) =>
      `<li>
        ${d.documentType ? d.documentType + ": " : ""} 
        <a href="${d.fileUrl}" target="_blank">${d.originalFilename || "View"}</a>
      </li>`
    ).join('')}</ul>`;
  };

  // Address Section
  const currAddr = data.addressVerification?.currentAddress || {};
  const currTenure = data.addressVerification?.currentTenure || {};
  const permAddr = data.addressVerification?.permanentAddress || {};
  const permTenure = data.addressVerification?.permanentTenure || {};
  const addressDocs = data.addressVerification?.uploadedDocuments || [];

  // Education Section
  const education = data.educationVerification || [];
  // Employment Section
  const employment = data.employmentVerification || [];
  // Identity Section
  const identity = data.identityVerification || [];
  // Authorization Section
  const authorization = data.authorization || {};

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
              <td>${data.personalDetails?.fullName || ""}</td>
              <td rowspan="6">
                ${data.passportPhotoUrl ? `<img class="photo" src="${data.passportPhotoUrl}" />` : ''}
              </td>
            </tr>
            <tr><td><b>Father's Name</b></td><td>${data.personalDetails?.fatherName || ""}</td></tr>
            <tr><td><b>Spouse's Name</b></td><td>${data.personalDetails?.spouseName || ""}</td></tr>
            <tr><td><b>Date of Birth</b></td><td>${data.personalDetails?.dob ? (new Date(data.personalDetails.dob)).toLocaleDateString() : ""}</td></tr>
            <tr><td><b>Gender</b></td><td>${data.personalDetails?.gender || ""}</td></tr>
            <tr><td><b>Marital Status</b></td><td>${data.personalDetails?.maritalStatus || ""}</td></tr>
            <tr><td><b>Nationality</b></td><td>${data.personalDetails?.nationality || ""}</td></tr>
            <tr><td><b>Email</b></td><td>${data.email || ""}</td></tr>
            <tr><td><b>Mobile</b></td><td>${data.mobile || ""}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="title">Address Verification</div>
          <b>Current Address</b>
          <table>
            <tr>
              <td>House No</td><td>${currAddr.houseNo || ""}</td>
              <td>Street/Area</td><td>${currAddr.streetArea || ""}</td>
              <td>Landmark</td><td>${currAddr.landmark || ""}</td>
            </tr>
            <tr>
              <td>City</td><td>${currAddr.city || ""}</td>
              <td>State</td><td>${currAddr.state || ""}</td>
              <td>Pincode</td><td>${currAddr.pinCode || ""}</td>
            </tr>
            <tr>
              <td>Country</td><td>${currAddr.country || ""}</td>
              <td colspan="4"></td>
            </tr>
            <tr>
              <td>Period of Stay</td><td colspan="5">${currTenure.fromMonth || ""}/${currTenure.fromYear || ""} to ${currTenure.isPresent ? 'Present' : (currTenure.toMonth || "") + "/" + (currTenure.toYear || "")}</td>
            </tr>
          </table>
          <b>Permanent Address</b>
          <table>
            <tr>
              <td>House No</td><td>${permAddr.houseNo || ""}</td>
              <td>Street/Area</td><td>${permAddr.streetArea || ""}</td>
              <td>Landmark</td><td>${permAddr.landmark || ""}</td>
            </tr>
            <tr>
              <td>City</td><td>${permAddr.city || ""}</td>
              <td>State</td><td>${permAddr.state || ""}</td>
              <td>Pincode</td><td>${permAddr.pinCode || ""}</td>
            </tr>
            <tr>
              <td>Country</td><td>${permAddr.country || ""}</td>
              <td colspan="4"></td>
            </tr>
            <tr>
              <td>Period of Stay</td><td colspan="5">${permTenure.fromMonth || ""}/${permTenure.fromYear || ""} to ${permTenure.isPresent ? 'Present' : (permTenure.toMonth || "") + "/" + (permTenure.toYear || "")}</td>
            </tr>
          </table>
          <b>Uploaded Address Documents:</b>
          ${renderDocs(addressDocs)}
        </div>

        <div class="section">
          <div class="title">Education Verification</div>
          ${
            education.length
              ? education.map((e: any, i: number) => `
                  <b>Entry #${i+1}</b>
                  <table>
                    <tr><td>Qualification</td><td>${e.qualification || ""}</td></tr>
                    <tr><td>School/College</td><td>${e.schoolNameAddress || ""}</td></tr>
                    <tr><td>Joining</td><td>${e.joiningMonth || ""}/${e.joiningYear || ""}</td></tr>
                    <tr><td>Passing</td><td>${e.passingMonth || ""}/${e.passingYear || ""}</td></tr>
                    <tr><td>Other Details</td><td>${e.otherDetails || ""}</td></tr>
                    <tr><td>Uploaded Documents</td><td>${renderDocs(e.uploadedDocuments)}</td></tr>
                  </table>
                `).join("")
              : "<i>No education records</i>"
          }
        </div>

        <div class="section">
          <div class="title">Employment Verification</div>
          ${
            employment.length
              ? employment.map((e: any, i: number) => `
                <b>Entry #${i+1}</b>
                <table>
                  <tr><td>Employer Name</td><td>${e.employerName || ""}</td></tr>
                  <tr><td>Designation</td><td>${e.designation || ""}</td></tr>
                  <tr><td>Company Address</td><td>${e.companyAddress || ""}</td></tr>
                  <tr><td>Joining</td><td>${e.joiningMonth || ""}/${e.joiningYear || ""}</td></tr>
                  <tr><td>Last Working</td><td>${e.lastWorkingMonth || ""}/${e.lastWorkingYear || ""}</td></tr>
                  <tr><td>Is Present Employee</td><td>${e.isPresentEmployee ? "Yes" : "No"}</td></tr>
                  <tr><td>Reason for Leaving</td><td>${e.reasonForLeaving || ""}</td></tr>
                  <tr><td>Uploaded Documents</td><td>${renderDocs(e.uploadedDocuments)}</td></tr>
                </table>
              `).join("")
              : "<i>No employment records</i>"
          }
        </div>

        <div class="section">
          <div class="title">Identity Verification</div>
          ${
            identity.length
              ? identity.map((e: any, i: number) => `
                <b>Entry #${i+1}</b>
                <table>
                  <tr><td>ID Type</td><td>${e.idType || ""}</td></tr>
                  <tr><td>ID Number</td><td>${e.idNumber || ""}</td></tr>
                  <tr><td>Other ID Name</td><td>${e.otherIdTypeName || ""}</td></tr>
                  <tr><td>Uploaded Documents</td><td>${renderDocs(e.uploadedDocuments)}</td></tr>
                </table>
              `).join("")
              : "<i>No identity records</i>"
          }
        </div>

        <div class="section">
          <div class="title">Authorization / Declaration</div>
          <table>
            <tr><td>Employer Name for LOA</td><td>${authorization.employerNameForLOA || ""}</td></tr>
            <tr><td>Place</td><td>${authorization.place || ""}</td></tr>
            <tr><td>Date</td><td>${authorization.declarationDate ? (new Date(authorization.declarationDate)).toLocaleDateString() : ""}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="title">Signature</div>
          ${
            data.signatureImageUrl
              ? `<img src="${data.signatureImageUrl}" style="width:120px; border:1px solid #333;" />`
              : `<span style="color:#999">Not provided</span>`
          }
        </div>
      </body>
    </html>
  `;
}

export async function generateBgvPdf(data: any, pdfFilePath: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  const html = getBgvHtml(data);
  await page.setContent(html, { waitUntil: "networkidle0" });
  await fs.mkdir(path.dirname(pdfFilePath), { recursive: true });
  await page.pdf({
    path: pdfFilePath,
    format: "A4",
    printBackground: true,
    margin: { top: "32px", bottom: "32px", left: "24px", right: "24px" },
  });
  await browser.close();
  return pdfFilePath;
}
