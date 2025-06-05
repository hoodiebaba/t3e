// src/app/api/bgv-forms/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, BackgroundVerificationForm } from '@prisma/client'; // Ensure BackgroundVerificationForm is correctly imported
import formidable, { File as FormidableFile, Fields, Files as FormidableFiles } from 'formidable'; // Renamed Files to FormidableFiles to avoid conflict
import fs from 'fs/promises';
import path from 'path';
import { generateBgvPdf } from "@/lib/generateBgvPdf";


// Removed Writable as we'll try a more direct approach

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Helper Types from your frontend (SAME AS BEFORE) ---
interface FrontendDocumentFile {
  id: string;
  documentType?: string;
  file?: File | FormidableFile | null;
  fileName?: string;
  fileType?: string;
  previewUrl?: string | null;
  fileUrl?: string | null;
}
interface BaseEntry {
  id: number | string; // Keep this as is from your shared code for now
  uploadedDocuments: FrontendDocumentFile[];
}
interface EducationEntryData extends BaseEntry {
  qualification: string; otherQualificationName?: string; schoolNameAddress: string; joiningMonth: string; joiningYear: string; passingMonth: string; passingYear: string; otherDetails?: string;
}
interface EmploymentEntryData extends BaseEntry {
  employerName: string; designation: string; companyAddress?: string; joiningMonth: string; joiningYear: string; lastWorkingMonth?: string; lastWorkingYear?: string; isPresentEmployee: boolean; reasonForLeaving?: string;
}
interface IdentityEntryData extends BaseEntry {
  idType: string; otherIdTypeName?: string; idNumber: string;
}
interface FrontendFormData {
  email?: string; mobile?: string; alternateMobile?: string;
  personalDetails?: {
    fullName?: string; formerName?: string; fatherName?: string; spouseName?: string; dob?: string; gender?: string; nationality?: string; maritalStatus?: string;
    passportPhoto?: { file?: File | FormidableFile, fileName?: string, fileType?: string, previewUrl?: string, fileUrl?: string } | null;
  };
  addressVerification?: {
    currentAddress?: { houseNo?: string, streetArea?: string, landmark?: string, city?: string, state?: string, pinCode?: string, country?: string };
    currentTenure?: { fromMonth?: string, fromYear?: string, toMonth?: string, toYear?: string, isPresent?: boolean };
    isPermanentSameAsCurrent?: boolean;
    permanentAddress?: { houseNo?: string, streetArea?: string, landmark?: string, city?: string, state?: string, pinCode?: string, country?: string };
    permanentTenure?: { fromMonth?: string, fromYear?: string, toMonth?: string, toYear?: string, isPresent?: boolean };
    uploadedDocuments?: FrontendDocumentFile[];
  };
  educationVerification?: EducationEntryData[];
  employmentVerification?: EmploymentEntryData[];
  identityVerification?: IdentityEntryData[];
  authorization?: {
    employerNameForLOA?: string;
    signatureDataUrl?: string | null;
    place?: string;
    declarationDate?: string;
  };
}


// --- UPDATED File Handling and Parsing ---
async function parseNextJSFormData(req: NextRequest): Promise<{ fields: { [key: string]: string }; files: { [key: string]: FormidableFile[] } }> {
  const formData = await req.formData();
  const fields: { [key: string]: string } = {};
  const filesOutput: { [key: string]: FormidableFile[] } = {};

  for (const [key, value] of formData.entries()) {
    if (
      value &&
      typeof value === "object" &&
      (
        "arrayBuffer" in value ||
        "originalFilename" in value
      )
    ) {
      const tempPath = path.join(process.cwd(), 'uploads_tmp', `${Date.now()}_${value.name || value.originalFilename}`);
      await fs.mkdir(path.dirname(tempPath), { recursive: true });
      let fileBuffer;
      if (typeof value.arrayBuffer === "function") {
        fileBuffer = Buffer.from(await value.arrayBuffer());
      } else if (value._writeStream && value._writeStream._writableState) {
        fileBuffer = await fs.readFile(value.filepath);
      }
      await fs.writeFile(tempPath, fileBuffer);

      const formidableFileInstance = {
        filepath: tempPath,
        originalFilename: value.name || value.originalFilename,
        newFilename: path.basename(tempPath),
        mimetype: value.type || value.mimetype,
        size: value.size,
        lastModifiedDate: value.lastModified ? new Date(value.lastModified) : undefined,
        toJSON: function () {
          return {
            size: this.size,
            filepath: this.filepath,
            originalFilename: this.originalFilename,
            newFilename: this.newFilename,
            mimetype: this.mimetype,
          };
        }
      };
      if (!filesOutput[key]) filesOutput[key] = [];
      filesOutput[key].push(formidableFileInstance);
    } else {
      fields[key] = value as string;
    }
  }
  return { fields, files: filesOutput };
}



// Placeholder function to "save" a file (ADAPTED for new parser if needed)
async function saveUploadedFile(file: FormidableFile, subfolder: string): Promise<{ url: string; originalFilename: string }> {
  // This function now receives a FormidableFile-like object from parseNextJSFormData
  // The `file.filepath` will be the temporary path where we saved it.
  console.log(`SAVE_UPLOADED_FILE: Simulating save for: ${file.originalFilename} (from temp path: ${file.filepath}) to subfolder ${subfolder}. Size: ${file.size}`);
  
  const uniqueFilename = `${Date.now()}_${file.originalFilename || 'unknown_file'}`;
  const mockUrl = `/uploads/${subfolder}/${uniqueFilename}`;

  // In a real scenario, you'd move from file.filepath to a persistent location.
  // For example:
  // const persistentDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  // await fs.mkdir(persistentDir, { recursive: true });
  // const persistentPath = path.join(persistentDir, uniqueFilename);
  // await fs.rename(file.filepath, persistentPath); // Move the file
  // console.log(`SAVE_UPLOADED_FILE: Actual file moved to ${persistentPath}`);
  
  // Since we created a temp file, we might want to clean it up if it's not moved
  // For this placeholder, we assume it's handled or will be overwritten.
  // If using fs.rename, the temp file is "moved", so no separate cleanup is needed for that specific file.

  return { url: mockUrl, originalFilename: file.originalFilename || 'unknown_file' };
}

// saveBase64AsImage and parseDMYToISO functions remain THE SAME AS BEFORE

// Helper to parse DD/MM/YYYY to ISO String
function parseDMYToISO(dmyDate?: string): string | undefined {
  if (!dmyDate) return undefined;
  const parts = dmyDate.split('/'); // Assuming DD/MM/YYYY
  if (parts.length === 3) {
    const dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString();
    }
  }
  console.warn(`Could not parse date: ${dmyDate}`);
  return undefined;
}

// Placeholder function to save a base64 image string and return its mock URL
async function saveBase64AsImage(base64Data: string, subfolder: string, filenamePrefix: string): Promise<{ url: string; originalFilename: string } | null> {
  if (!base64Data) return null;
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    console.warn("Invalid base64 image data format");
    return null;
  }
  const imageBuffer = Buffer.from(matches[2], 'base64');
  const originalFilename = `${filenamePrefix}_${Date.now()}.png`;
  console.log(`SAVE_BASE64: Simulating save for base64 image: ${originalFilename} to subfolder ${subfolder}. Size: ${imageBuffer.length}`);
  const mockUrl = `/uploads/${subfolder}/${originalFilename}`;
  // Actual save logic:
  // const actualSaveDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  // await fs.mkdir(actualSaveDir, { recursive: true });
  // const actualSavePath = path.join(actualSaveDir, originalFilename);
  // await fs.writeFile(actualSavePath, imageBuffer);
  return { url: mockUrl, originalFilename };
}


// --- API Route Handlers ---
// GET handler REMAINS THE SAME AS YOU PROVIDED

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const routeToken = params.token; // Use a different variable name to avoid confusion
  console.log(`--- GET Request Received for token: ${routeToken} ---`);

  if (!routeToken) {
    console.error("GET Error: Token is required in params");
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const formLink = await prisma.formLinks.findUnique({
      where: { token: routeToken },
    });

    if (!formLink) {
      console.warn(`GET Warning: Invalid or expired form link for token ${routeToken}`);
      return NextResponse.json({ error: "Invalid or expired form link" }, { status: 404 });
    }
    console.log(`GET: FormLink found for token ${routeToken}, status: ${formLink.status}`);

    let bgvFormData = await prisma.backgroundVerificationForm.findUnique({
      where: { formLinkToken: routeToken },
    });

    if (!bgvFormData) {
      console.log(`GET: No BGV data found for token ${routeToken}. FormLink status: ${formLink.status}`);
      if (formLink.status === "pending") {
        console.log(`GET: Updating FormLink status to "clicked" for token ${routeToken}`);
        await prisma.formLinks.update({
          where: { token: routeToken },
          data: { status: "clicked" },
        });
      }
      return NextResponse.json({ message: "Form link is valid, no data yet.", status: "pending_user_input" }, { status: 200 });
    }
    
    if (formLink.status === "pending") {
       console.log(`GET: BGV data found. Updating FormLink status to "clicked" for token ${routeToken}`);
       await prisma.formLinks.update({
         where: { token: routeToken },
         data: { status: "clicked" }, 
       });
    }
    console.log(`GET: Returning BGV data for token ${routeToken}`);
    return NextResponse.json(bgvFormData, { status: 200 });

  } catch (error) {
    console.error(`GET BGV Form Error for token ${routeToken}:`, error);
    return NextResponse.json({ error: "Failed to fetch form data" }, { status: 500 });
  }
}


// --- UPDATED PUT HANDLER ---
export async function PUT(req: NextRequest, { params }: { params: { token: string } }) {
  const routeToken = params.token; // Use a different variable name
  console.log(`\n--- PUT Request Received for token: ${routeToken} at ${new Date().toISOString()} ---`);

  if (!routeToken) {
    console.error("PUT Error: Token is required");
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    console.log("PUT: Checking FormLink in DB...");
    const formLink = await prisma.formLinks.findUnique({ where: { token: routeToken } });
    if (!formLink) {
      console.error(`PUT Error: Invalid form link for token ${routeToken}`);
      return NextResponse.json({ error: "Invalid form link" }, { status: 404 });
    }
    console.log(`PUT: FormLink found for token ${routeToken}:`, formLink.status);

    if (formLink.status === "submitted" || formLink.status === "expired") {
      console.warn(`PUT Warning: Form for token ${routeToken} is already ${formLink.status}.`);
      return NextResponse.json({ error: `Form is already ${formLink.status} and cannot be updated as draft.` }, { status: 403 });
    }

    console.log("PUT: Attempting to parse form data using req.formData()...");
    const { fields, files } = await parseNextJSFormData(req); // USE THE NEW PARSER
    console.log("PUT: Form data parsed. Fields received:", Object.keys(fields));
    console.log("PUT: Files received (names):", Object.entries(files).map(([key, fileArr]) => `${key}: ${fileArr.map(f => f.originalFilename).join(', ')}`));


    const jsonDataString = fields.jsonData; // No longer an array
    if (!jsonDataString) {
        console.error("PUT Error: Missing jsonData field");
        return NextResponse.json({ error: "Missing jsonData field in form-data" }, { status: 400 });
    }
    const clientFormData: FrontendFormData = JSON.parse(jsonDataString);
    console.log("PUT: Parsed jsonData field into clientFormData");

    // --- Process files ---
    console.log("PUT: Processing passport photo...");
    let passportPhotoUrl: string | undefined = clientFormData.personalDetails?.passportPhoto?.fileUrl;
    const passportPhotoApiFile = files.passportPhotoFile?.[0]; // Key from frontend `apiReqFormData.append('passportPhotoFile', ...)`
    if (passportPhotoApiFile) {
      console.log("PUT: New passportPhotoFile found, saving...");
      const saved = await saveUploadedFile(passportPhotoApiFile, 'passport_photos');
      passportPhotoUrl = saved.url;
      console.log("PUT: Passport photo saved, URL:", passportPhotoUrl);
    } else {
      console.log("PUT: No new passportPhotoFile found, using existing URL if any:", passportPhotoUrl);
    }
    
    console.log("PUT: Processing signature...");
    let signatureImageUrl: string | undefined = clientFormData.authorization?.signatureDataUrl?.startsWith('data:image') 
        ? undefined // Will be generated if it's new base64
        : clientFormData.authorization?.signatureDataUrl; // Could be an existing URL

    if(clientFormData.authorization?.signatureDataUrl && clientFormData.authorization.signatureDataUrl.startsWith('data:image')) {
        console.log("PUT: New signature base64 found, saving...");
        const savedSignature = await saveBase64AsImage(clientFormData.authorization.signatureDataUrl, 'signatures', `sig_${routeToken}_draft`);
        if (savedSignature) {
            signatureImageUrl = savedSignature.url;
            console.log("PUT: Signature image saved, URL:", signatureImageUrl);
        }
    } else {
        console.log("PUT: No new signature base64, using existing URL if any:", signatureImageUrl);
    }

    const processUploadedDocuments = async (
        docClientArray: FrontendDocumentFile[] | undefined, // from jsonDataPayload
        fileKeyPrefix: string,
        subfolder: string
    ): Promise<any[]> => {
        if (!docClientArray) return [];
        const processedDbDocs = [];
        for (let i = 0; i < docClientArray.length; i++) {
            const clientDocInfo = docClientArray[i]; // This contains id, documentType, and existing fileUrl
            let finalFileUrl = clientDocInfo.fileUrl; // Assume existing URL first
            let finalOriginalFilename = clientDocInfo.fileName;

            // Check if a new file was uploaded for this document slot
            const formidableFile = files[`${fileKeyPrefix}_${i}`]?.[0];
            if (formidableFile) {
                console.log(`PUT: New file found for ${fileKeyPrefix}_${i}, saving: ${formidableFile.originalFilename}`);
                const savedNewFile = await saveUploadedFile(formidableFile, subfolder);
                finalFileUrl = savedNewFile.url;
                finalOriginalFilename = savedNewFile.originalFilename;
                console.log(`PUT: Saved ${fileKeyPrefix}_${i} to URL: ${finalFileUrl}`);
            } else if (finalFileUrl) {
                 console.log(`PUT: No new file for ${fileKeyPrefix}_${i}, keeping existing URL: ${finalFileUrl}`);
            }


            // Only add to DB array if there's a URL (either existing or newly uploaded)
            if(finalFileUrl) {
                processedDbDocs.push({
                    id: clientDocInfo.id || `doc_${Date.now()}`, // Frontend ID or new
                    documentType: clientDocInfo.documentType,
                    fileUrl: finalFileUrl,
                    originalFilename: finalOriginalFilename,
                });
            }
        }
        return processedDbDocs;
    };
    
    console.log("PUT: Processing address documents...");
    const dbAddressDocs = await processUploadedDocuments(clientFormData.addressVerification?.uploadedDocuments, 'addressDoc', 'address_proofs');
    
    const dbEducationEntries = [];
    if (clientFormData.educationVerification) {
        console.log("PUT: Processing education documents...");
        for (let i = 0; i < clientFormData.educationVerification.length; i++) {
            const entry = clientFormData.educationVerification[i];
            const docs = await processUploadedDocuments(entry.uploadedDocuments, `education_${i}_doc`, 'education_proofs');
            dbEducationEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `edu_${Date.now()}` });
        }
    }
    // Similar logging for employment and identity

    const dbEmploymentEntries = [];
    if (clientFormData.employmentVerification) {
        console.log("PUT: Processing employment documents...");
        for (let i = 0; i < clientFormData.employmentVerification.length; i++) {
            const entry = clientFormData.employmentVerification[i];
            const docs = await processUploadedDocuments(entry.uploadedDocuments, `employment_${i}_doc`, 'employment_proofs');
            dbEmploymentEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `emp_${Date.now()}` });
        }
    }
    
    const dbIdentityEntries = [];
    if (clientFormData.identityVerification) {
        console.log("PUT: Processing identity documents...");
        for (let i = 0; i < clientFormData.identityVerification.length; i++) {
            const entry = clientFormData.identityVerification[i];
            const docs = await processUploadedDocuments(entry.uploadedDocuments, `identity_${i}_doc`, 'identity_proofs');
            dbIdentityEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `idt_${Date.now()}` });
        }
    }

    console.log("PUT: Preparing dataToSave for Prisma...");
    const dataToSave: Omit<BackgroundVerificationForm, 'id' | 'createdAt' | 'updatedAt' | 'formLinkToken'> & { formLinkToken: string } = {
      formLinkToken: routeToken,
      status: "draft",
      clicked: true,
      draftExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      email: clientFormData.email || null,
      mobile: clientFormData.mobile || null,
      alternateMobile: clientFormData.alternateMobile || null,
      passportPhotoUrl: passportPhotoUrl || null,
      signatureImageUrl: signatureImageUrl || null,
      personalDetails: clientFormData.personalDetails ? {
        ...clientFormData.personalDetails,
        passportPhoto: undefined, // Remove the object, URL is top-level
        dob: clientFormData.personalDetails.dob ? new Date(clientFormData.personalDetails.dob).toISOString() : null,
      } : null,
      addressVerification: clientFormData.addressVerification ? {
        ...clientFormData.addressVerification,
        uploadedDocuments: dbAddressDocs,
      } : null,
      educationVerification: dbEducationEntries.length > 0 ? dbEducationEntries : null,
      employmentVerification: dbEmploymentEntries.length > 0 ? dbEmploymentEntries : null,
      identityVerification: dbIdentityEntries.length > 0 ? dbIdentityEntries : null,
      authorization: clientFormData.authorization ? {
        ...clientFormData.authorization,
        signatureDataUrl: undefined, // Remove base64, URL is top-level (signatureImageUrl)
        declarationDate: parseDMYToISO(clientFormData.authorization.declarationDate)
      } : null,
      responsePDFUrl: null,
      submittedAt: null,
    };
    // console.log("PUT: Data to save (structure check):", JSON.stringify(dataToSave, null, 2).substring(0, 500) + "...");


    console.log("PUT: Calling prisma.backgroundVerificationForm.upsert...");
    const savedDraft = await prisma.backgroundVerificationForm.upsert({
      where: { formLinkToken: routeToken },
      update: dataToSave,
      create: dataToSave,
    });
    console.log("PUT: Draft upserted successfully. ID:", savedDraft.id);

    console.log("PUT: Updating FormLinks status...");
    await prisma.formLinks.update({
      where: { token: routeToken },
      data: { status: "draft_saved" },
    });
    console.log("PUT: FormLinks status updated to draft_saved.");
    console.log("--- PUT Request Processed Successfully for token:", routeToken, "---");

    return NextResponse.json({ message: "Draft saved successfully", data: savedDraft }, { status: 200 });

  } catch (error: any) {
    console.error(`--- PUT BGV Form (Save Draft) CATCH BLOCK for token ${routeToken} ---`);
    console.error("PUT Error Full Object:", error);
    return NextResponse.json({ error: "Failed to save draft", details: error.message || String(error) }, { status: 500 });
  }
}

// POST handler REMAINS LARGELY THE SAME but should also use parseNextJSFormData
// Make sure to adapt its file processing logic like in PUT
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const routeToken = params.token;
  console.log(`\n--- POST Request Received for token: ${routeToken} at ${new Date().toISOString()} ---`);

  if (!routeToken) {
    console.error("POST Error: Token is required");
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    // 1. Validate form link
    const formLink = await prisma.formLinks.findUnique({ where: { token: routeToken } });
    if (!formLink) {
      console.error(`POST Error: Invalid form link for token ${routeToken}`);
      return NextResponse.json({ error: "Invalid form link" }, { status: 404 });
    }
    if (formLink.status === "submitted") {
      return NextResponse.json({ error: "Form has already been submitted." }, { status: 409 });
    }
    if (formLink.status === "expired") {
      return NextResponse.json({ error: "Form link has expired." }, { status: 410 });
    }

    // 2. Parse form-data
    const { fields, files } = await parseNextJSFormData(req);
    const jsonDataString = fields.jsonData;
    if (!jsonDataString) {
      return NextResponse.json({ error: "Missing jsonData field in form-data" }, { status: 400 });
    }
    const clientFormData: FrontendFormData = JSON.parse(jsonDataString);

    // 3. Validate essential data
    if (!clientFormData.email || !clientFormData.personalDetails?.fullName) {
      return NextResponse.json({ error: "Required fields like email or full name are missing." }, { status: 400 });
    }
    const hasNewSignatureBase64 = clientFormData.authorization?.signatureDataUrl?.startsWith('data:image');
    const existingBgvDataForSigCheck = await prisma.backgroundVerificationForm.findUnique({ where: { formLinkToken: routeToken }});
    const hasExistingSignatureUrl = !!existingBgvDataForSigCheck?.signatureImageUrl || !!clientFormData.authorization?.signatureImageUrl;

    if (!hasNewSignatureBase64 && !hasExistingSignatureUrl) {
      return NextResponse.json({ error: "Signature is required for submission." }, { status: 400 });
    }

    // 4. Process files (passport photo, signature, documents) - same as your existing code
    let passportPhotoUrl: string | undefined = clientFormData.personalDetails?.passportPhoto?.fileUrl;
    const passportPhotoApiFile = files.passportPhotoFile?.[0];
    if (passportPhotoApiFile) {
      const saved = await saveUploadedFile(passportPhotoApiFile, 'passport_photos');
      passportPhotoUrl = saved.url;
    }

    let signatureImageUrl: string | undefined;
    if(hasNewSignatureBase64 && clientFormData.authorization?.signatureDataUrl) {
      const savedSignature = await saveBase64AsImage(clientFormData.authorization.signatureDataUrl, 'signatures', `sig_${routeToken}_final`);
      if (savedSignature) signatureImageUrl = savedSignature.url;
    } else if (hasExistingSignatureUrl) {
      signatureImageUrl = clientFormData.authorization?.signatureImageUrl || existingBgvDataForSigCheck?.signatureImageUrl || undefined;
    }
    if (!signatureImageUrl) {
      return NextResponse.json({ error: "Signature processing failed." }, { status: 500 });
    }

    // --- Docs processing (as-is, same as your code) ---
    const processUploadedDocuments = async (
      docClientArray: FrontendDocumentFile[] | undefined,
      fileKeyPrefix: string,
      subfolder: string,
      existingDbDocsForEntry?: any[]
    ): Promise<any[]> => {
      if (!docClientArray) return existingDbDocsForEntry || [];
      const processedDbDocs = [];
      const existingDocsMap = new Map(existingDbDocsForEntry?.map(d => [d.id || d.fileUrl, d]));
      for (let i = 0; i < docClientArray.length; i++) {
        const clientDocInfo = docClientArray[i];
        let finalFileUrl = clientDocInfo.fileUrl || existingDocsMap.get(clientDocInfo.id || clientDocInfo.fileUrl)?.fileUrl;
        let finalOriginalFilename = clientDocInfo.fileName || existingDocsMap.get(clientDocInfo.id || clientDocInfo.fileUrl)?.originalFilename;
        const formidableFile = files[`${fileKeyPrefix}_${i}`]?.[0];
        if (formidableFile) {
          const savedNewFile = await saveUploadedFile(formidableFile, subfolder);
          finalFileUrl = savedNewFile.url;
          finalOriginalFilename = savedNewFile.originalFilename;
        }
        if (finalFileUrl) {
          processedDbDocs.push({
            id: clientDocInfo.id || `doc_${Date.now()}`,
            documentType: clientDocInfo.documentType,
            fileUrl: finalFileUrl,
            originalFilename: finalOriginalFilename,
          });
        }
      }
      return processedDbDocs;
    };

    const existingBgvData = await prisma.backgroundVerificationForm.findUnique({ where: { formLinkToken: routeToken }});

    const dbAddressDocs = await processUploadedDocuments(
      clientFormData.addressVerification?.uploadedDocuments,
      'addressDoc', 'address_proofs',
      existingBgvData?.addressVerification ? (existingBgvData.addressVerification as any).uploadedDocuments : []
    );
    const dbEducationEntries = [];
    if (clientFormData.educationVerification) {
      for (let i = 0; i < clientFormData.educationVerification.length; i++) {
        const entry = clientFormData.educationVerification[i];
        const existingEntryDocs = (existingBgvData?.educationVerification as any[])?.find(e => e.id === entry.id)?.uploadedDocuments;
        const docs = await processUploadedDocuments(entry.uploadedDocuments, `education_${i}_doc`, 'education_proofs', existingEntryDocs);
        dbEducationEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `edu_${Date.now()}` });
      }
    }
    const dbEmploymentEntries = [];
    if (clientFormData.employmentVerification) {
      for (let i = 0; i < clientFormData.employmentVerification.length; i++) {
        const entry = clientFormData.employmentVerification[i];
        const existingEntryDocs = (existingBgvData?.employmentVerification as any[])?.find(e => e.id === entry.id)?.uploadedDocuments;
        const docs = await processUploadedDocuments(entry.uploadedDocuments, `employment_${i}_doc`, 'employment_proofs', existingEntryDocs);
        dbEmploymentEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `emp_${Date.now()}` });
      }
    }
    const dbIdentityEntries = [];
    if (clientFormData.identityVerification) {
      for (let i = 0; i < clientFormData.identityVerification.length; i++) {
        const entry = clientFormData.identityVerification[i];
        const existingEntryDocs = (existingBgvData?.identityVerification as any[])?.find(e => e.id === entry.id)?.uploadedDocuments;
        const docs = await processUploadedDocuments(entry.uploadedDocuments, `identity_${i}_doc`, 'identity_proofs', existingEntryDocs);
        dbIdentityEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `idt_${Date.now()}` });
      }
    }

    // --- PDF Generation STARTS HERE ---
    // Candidate name safe for file, fallback 'bgv'
     const candidateName = clientFormData.personalDetails?.fullName?.replace(/\s+/g, "_") || "bgv";
  const pdfName = candidateName + "_bgv.pdf";
  const pdfDir = path.join(process.cwd(), "public", "bgv");
  const pdfPath = path.join(pdfDir, pdfName);
  const pdfUrl = `/bgv/${pdfName}`;
    await fs.mkdir(pdfDir, { recursive: true });
    await generateBgvPdf(clientFormData, pdfPath);

    // --- Prepare Data to Save ---
    const dataToSave: Omit<BackgroundVerificationForm, 'id' | 'createdAt' | 'updatedAt' | 'formLinkToken'> & { formLinkToken: string } = {
      formLinkToken: routeToken,
      status: "submitted",
      clicked: true,
      draftExpiresAt: null,
      email: clientFormData.email || null,
      mobile: clientFormData.mobile || null,
      alternateMobile: clientFormData.alternateMobile || null,
      passportPhotoUrl: passportPhotoUrl || null,
      signatureImageUrl: signatureImageUrl,
      personalDetails: clientFormData.personalDetails ? {
        ...clientFormData.personalDetails,
        passportPhoto: undefined,
        dob: clientFormData.personalDetails.dob ? new Date(clientFormData.personalDetails.dob).toISOString() : null,
      } : null,
      addressVerification: clientFormData.addressVerification ? {
        ...clientFormData.addressVerification,
        uploadedDocuments: dbAddressDocs,
      } : null,
      educationVerification: dbEducationEntries.length > 0 ? dbEducationEntries : null,
      employmentVerification: dbEmploymentEntries.length > 0 ? dbEmploymentEntries : null,
      identityVerification: dbIdentityEntries.length > 0 ? dbIdentityEntries : null,
      authorization: clientFormData.authorization ? {
        ...clientFormData.authorization,
        signatureDataUrl: undefined,
        declarationDate: parseDMYToISO(clientFormData.authorization.declarationDate)
      } : null,
      responsePDFUrl: pdfUrl,
      submittedAt: new Date(),
    };

    // --- Save to DB ---
    const submittedForm = await prisma.backgroundVerificationForm.upsert({
      where: { formLinkToken: routeToken },
      update: dataToSave,
      create: dataToSave,
    });

    // --- Update FormLink ---
    await prisma.formLinks.update({
      where: { token: routeToken },
      data: {
        status: "submitted",
        candidateName: clientFormData.personalDetails?.fullName || formLink.candidateName,
        responsePDF: pdfUrl,
      },
    });

    return NextResponse.json({ message: "Form submitted successfully", data: submittedForm }, { status: 200 });

  } catch (error: any) {
    console.error("--- POST BGV Form (Submit) Error ---", error);
    return NextResponse.json({ error: "Failed to submit form", details: error.message || String(error) }, { status: 500 });
  }
}
