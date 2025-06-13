// File: src/app/api/bgv-forms/[token]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, BackgroundVerificationForm } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { generateBgvPdf } from '@/lib/generateBgvPdf';

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Helper Types from your frontend (UNCHANGED) ---
interface FrontendDocumentFile {
  id: string;
  documentType?: string;
  file?: File | null;
  fileName?: string;
  fileType?: string;
  previewUrl?: string | null;
  fileUrl?: string | null;
}
interface BaseEntry {
  id: number | string;
  uploadedDocuments: FrontendDocumentFile[];
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
interface FrontendFormData {
  email?: string;
  mobile?: string;
  alternateMobile?: string;
  personalDetails?: {
    fullName?: string;
    formerName?: string;
    fatherName?: string;
    spouseName?: string;
    dob?: string;
    gender?: string;
    nationality?: string;
    maritalStatus?: string;
    passportPhoto?: {
      file?: File;
      fileName?: string;
      fileType?: string;
      previewUrl?: string;
      fileUrl?: string;
    } | null;
  };
  addressVerification?: {
    currentAddress?: {
      houseNo?: string;
      streetArea?: string;
      landmark?: string;
      city?: string;
      state?: string;
      pinCode?: string;
      country?: string;
    };
    currentTenure?: {
      fromMonth?: string;
      fromYear?: string;
      toMonth?: string;
      toYear?: string;
      isPresent?: boolean;
    };
    isPermanentSameAsCurrent?: boolean;
    permanentAddress?: {
      houseNo?: string;
      streetArea?: string;
      landmark?: string;
      city?: string;
      state?: string;
      pinCode?: string;
      country?: string;
    };
    permanentTenure?: {
      fromMonth?: string;
      fromYear?: string;
      toMonth?: string;
      toYear?: string;
      isPresent?: boolean;
    };
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

// --- Minimal “ParsedFile” shape so downstream helpers can consume it ---
interface ParsedFile {
  filepath: string;
  originalFilename: string;
  newFilename: string;
  mimetype: string;
  size: number;
  toJSON: () => {
    size: number;
    filepath: string;
    originalFilename: string;
    newFilename: string;
    mimetype: string;
  };
}

// --- UPDATED File Handling and Parsing ---
async function parseNextJSFormData(
  req: NextRequest
): Promise<{
  fields: { [key: string]: string };
  files: { [key: string]: ParsedFile[] };
}> {
  const formData = await req.formData(); // NextRequest pe formData() available
  const fields: { [key: string]: string } = {};
  const filesOutput: { [key: string]: ParsedFile[] } = {};

  for (const [key, value] of formData.entries()) {
    if (value && typeof (value as any).arrayBuffer === 'function') {
      const fileLike: any = value;
      const originalName = fileLike.name;
      const newFilename = `${Date.now()}_${originalName}`;
      const uploadDir = path.join(process.cwd(), 'uploads_tmp');
      await fs.mkdir(uploadDir, { recursive: true });

      const tempPath = path.join(uploadDir, newFilename);
      const arrayBuffer = await fileLike.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(tempPath, buffer);

      const parsedFile: ParsedFile = {
        filepath: tempPath,
        originalFilename: originalName,
        newFilename,
        mimetype: fileLike.type,
        size: fileLike.size,
        toJSON() {
          return {
            size: this.size,
            filepath: this.filepath,
            originalFilename: this.originalFilename,
            newFilename: this.newFilename,
            mimetype: this.mimetype,
          };
        },
      };

      if (!filesOutput[key]) filesOutput[key] = [];
      filesOutput[key].push(parsedFile);
    } else {
      fields[key] = value.toString();
    }
  }

  return { fields, files: filesOutput };
}

// --- Placeholder function to "save" a file — now accepts ParsedFile ---
async function saveUploadedFile(
  file: ParsedFile,
  subfolder: string
): Promise<{ url: string; originalFilename: string }> {
  const uniqueFilename = `${Date.now()}_${file.originalFilename || 'unknown_file'}`;
  const mockUrl = `/uploads/${subfolder}/${uniqueFilename}`;
  return { url: mockUrl, originalFilename: file.originalFilename || 'unknown_file' };
}

// Helper to parse DD/MM/YYYY to ISO String
function parseDMYToISO(dmyDate?: string): string | null {
  if (!dmyDate) return null;
  const parts = dmyDate.split('/');
  if (parts.length === 3) {
    const dateObj = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
  }
  console.warn(`Could not parse date: ${dmyDate}`);
  return null;
}

// Placeholder function to save a base64-encoded image string
async function saveBase64AsImage(
  base64Data: string,
  subfolder: string,
  filenamePrefix: string
): Promise<{ url: string; originalFilename: string } | null> {
  if (!base64Data) return null;
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    console.warn('Invalid base64 image data format');
    return null;
  }
  const imageBuffer = Buffer.from(matches[2], 'base64');
  const originalFilename = `${filenamePrefix}_${Date.now()}.png`;
  const mockUrl = `/uploads/${subfolder}/${originalFilename}`;
  return { url: mockUrl, originalFilename };
}

// --- GET handler (Fetch existing BGV data) ---
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  const routeToken = params.token;
  console.log(`--- GET Request Received for token: ${routeToken} ---`);

  if (!routeToken) {
    console.error('GET Error: Token is required');
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const formLink = await prisma.formLinks.findUnique({
      where: { token: routeToken },
    });

    if (!formLink) {
      console.warn(`GET Warning: Invalid or expired form link for token ${routeToken}`);
      return NextResponse.json(
        { error: 'Invalid or expired form link' },
        { status: 404 }
      );
    }
    console.log(`GET: FormLink found for token ${routeToken}, status: ${formLink.status}`);

    const bgvFormData = await prisma.backgroundVerificationForm.findUnique({
      where: { formLinkToken: routeToken },
    });

    if (!bgvFormData) {
      console.log(
        `GET: No BGV data found for token ${routeToken}. FormLink status: ${formLink.status}`
      );
      if (formLink.status === 'pending') {
        console.log(`GET: Updating FormLink status to "clicked" for token ${routeToken}`);
        await prisma.formLinks.update({
          where: { token: routeToken },
          data: { status: 'Clicked' },
        });
      }
      return NextResponse.json(
        { message: 'Form link is valid, no data yet.', status: 'pending_user_input' },
        { status: 200 }
      );
    }

    if (formLink.status === 'pending') {
      console.log(
        `GET: BGV data found. Updating FormLink status to "clicked" for token ${routeToken}`
      );
      await prisma.formLinks.update({
        where: { token: routeToken },
        data: { status: 'Clicked' },
      });
    }
    console.log(`GET: Returning BGV data for token ${routeToken}`);
    return NextResponse.json(bgvFormData, { status: 200 });
  } catch (error) {
    console.error(`GET BGV Form Error for token ${routeToken}:`, error);
    return NextResponse.json({ error: 'Failed to fetch form data' }, { status: 500 });
  }
}

// --- PUT handler (Save Draft) ---
export async function PUT(
  req: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  const routeToken = params.token;
  console.log(`\n--- PUT Request Received for token: ${routeToken} at ${new Date().toISOString()} ---`);

  if (!routeToken) {
    console.error('PUT Error: Token is required');
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    console.log('PUT: Checking FormLink in DB...');
    const formLink = await prisma.formLinks.findUnique({ where: { token: routeToken } });
    if (!formLink) {
      console.error(`PUT Error: Invalid form link for token ${routeToken}`);
      return NextResponse.json({ error: 'Invalid form link' }, { status: 404 });
    }
    console.log(`PUT: FormLink found for token ${routeToken}:`, formLink.status);

    if (formLink.status === 'submitted' || formLink.status === 'expired') {
      console.warn(`PUT Warning: Form for token ${routeToken} is already ${formLink.status}.`);
      return NextResponse.json(
        { error: `Form is already ${formLink.status} and cannot be updated as draft.` },
        { status: 403 }
      );
    }

    console.log('PUT: Attempting to parse form data using req.formData()...');
    const { fields, files } = await parseNextJSFormData(req);
    console.log('PUT: Form data parsed. Fields received:', Object.keys(fields));
    console.log(
      'PUT: Files received (names):',
      Object.entries(files).map(([key, fileArr]) => `${key}: ${fileArr.map((f) => f.originalFilename).join(', ')}`)
    );

    const jsonDataString = fields.jsonData;
    if (!jsonDataString) {
      console.error('PUT Error: Missing jsonData field');
      return NextResponse.json(
        { error: 'Missing jsonData field in form-data' },
        { status: 400 }
      );
    }
    const clientFormData: FrontendFormData = JSON.parse(jsonDataString);
    console.log('PUT: Parsed jsonData field into clientFormData');

    // --- Process passport photo ---
    console.log('PUT: Processing passport photo...');
    let passportPhotoUrl: string | undefined = clientFormData.personalDetails?.passportPhoto?.fileUrl;
    const passportPhotoApiFile = files['passportPhotoFile']?.[0];
    if (passportPhotoApiFile) {
      console.log('PUT: New passportPhotoFile found, saving...');
      const saved = await saveUploadedFile(passportPhotoApiFile, 'passport_photos');
      passportPhotoUrl = saved.url;
      console.log('PUT: Passport photo saved, URL:', passportPhotoUrl);
    } else {
      console.log(
        'PUT: No new passportPhotoFile found, using existing URL if any:',
        passportPhotoUrl
      );
    }

    // --- Process signature ---
    console.log('PUT: Processing signature...');
    let signatureImageUrl: string | undefined =
      clientFormData.authorization?.signatureDataUrl?.startsWith('data:image')
        ? undefined
        : clientFormData.authorization?.signatureDataUrl;

    if (
      clientFormData.authorization?.signatureDataUrl &&
      clientFormData.authorization.signatureDataUrl.startsWith('data:image')
    ) {
      console.log('PUT: New signature base64 found, saving...');
      const savedSignature = await saveBase64AsImage(
        clientFormData.authorization.signatureDataUrl,
        'signatures',
        `sig_${routeToken}_draft`
      );
      if (savedSignature) {
        signatureImageUrl = savedSignature.url;
        console.log('PUT: Signature image saved, URL:', signatureImageUrl);
      }
    } else {
      console.log('PUT: No new signature base64, using existing URL if any:', signatureImageUrl);
    }

    // --- Helper to process uploadedDocuments for each entry ---
    const processUploadedDocuments = async (
      docClientArray: FrontendDocumentFile[] | undefined,
      fileKeyPrefix: string,
      subfolder: string
    ): Promise<
      { id: string | number; documentType?: string; fileUrl: string; originalFilename?: string }[]
    > => {
      if (!docClientArray) return [];
      const processedDbDocs: {
        id: string | number;
        documentType?: string;
        fileUrl: string;
        originalFilename?: string;
      }[] = [];

      for (let i = 0; i < docClientArray.length; i++) {
        const clientDocInfo = docClientArray[i];
        let finalFileUrl = clientDocInfo.fileUrl || undefined;
        let finalOriginalFilename = clientDocInfo.fileName || undefined;

        const parsedFile = files[`${fileKeyPrefix}_${i}`]?.[0];
        if (parsedFile) {
          console.log(
            `PUT: New file found for ${fileKeyPrefix}_${i}, saving: ${parsedFile.originalFilename}`
          );
          const savedNewFile = await saveUploadedFile(parsedFile, subfolder);
          finalFileUrl = savedNewFile.url;
          finalOriginalFilename = savedNewFile.originalFilename;
          console.log(`PUT: Saved ${fileKeyPrefix}_${i} to URL: ${finalFileUrl}`);
        } else if (finalFileUrl) {
          console.log(
            `PUT: No new file for ${fileKeyPrefix}_${i}, keeping existing URL: ${finalFileUrl}`
          );
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

    console.log('PUT: Processing address documents...');
    const dbAddressDocs = await processUploadedDocuments(
      clientFormData.addressVerification?.uploadedDocuments,
      'addressDoc',
      'address_proofs'
    );

    const dbEducationEntries: any[] = [];
    if (clientFormData.educationVerification) {
      console.log('PUT: Processing education documents...');
      for (let i = 0; i < clientFormData.educationVerification.length; i++) {
        const entry = clientFormData.educationVerification[i];
        const docs = await processUploadedDocuments(
          entry.uploadedDocuments,
          `education_${i}_doc`,
          'education_proofs'
        );
        dbEducationEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `edu_${Date.now()}` });
      }
    }

    const dbEmploymentEntries: any[] = [];
    if (clientFormData.employmentVerification) {
      console.log('PUT: Processing employment documents...');
      for (let i = 0; i < clientFormData.employmentVerification.length; i++) {
        const entry = clientFormData.employmentVerification[i];
        const docs = await processUploadedDocuments(
          entry.uploadedDocuments,
          `employment_${i}_doc`,
          'employment_proofs'
        );
        dbEmploymentEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `emp_${Date.now()}` });
      }
    }

    const dbIdentityEntries: any[] = [];
    if (clientFormData.identityVerification) {
      console.log('PUT: Processing identity documents...');
      for (let i = 0; i < clientFormData.identityVerification.length; i++) {
        const entry = clientFormData.identityVerification[i];
        const docs = await processUploadedDocuments(
          entry.uploadedDocuments,
          `identity_${i}_doc`,
          'identity_proofs'
        );
        dbIdentityEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `idt_${Date.now()}` });
      }
    }

    console.log('PUT: Preparing dataToSave for Prisma...');
    const dataToSave: Omit<
      BackgroundVerificationForm,
      'id' | 'createdAt' | 'updatedAt' | 'formLinkToken'
    > & { formLinkToken: string } = {
      formLinkToken: routeToken,
      status: 'draft',
      clicked: true,
      draftExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      email: clientFormData.email || null,
      mobile: clientFormData.mobile || null,
      alternateMobile: clientFormData.alternateMobile || null,
      passportPhotoUrl: passportPhotoUrl || null,
      signatureImageUrl: signatureImageUrl || null,
      personalDetails: clientFormData.personalDetails
        ? {
            ...clientFormData.personalDetails,
            passportPhoto: undefined,
            dob: clientFormData.personalDetails.dob
              ? new Date(clientFormData.personalDetails.dob).toISOString()
              : null,
          }
        : null,
      addressVerification: clientFormData.addressVerification
        ? {
            ...clientFormData.addressVerification,
            uploadedDocuments: dbAddressDocs,
          }
        : null,
      educationVerification: dbEducationEntries.length > 0 ? dbEducationEntries : null,
      employmentVerification: dbEmploymentEntries.length > 0 ? dbEmploymentEntries : null,
      identityVerification: dbIdentityEntries.length > 0 ? dbIdentityEntries : null,
      authorization: clientFormData.authorization
        ? {
            ...clientFormData.authorization,
            signatureDataUrl: undefined,
            declarationDate: parseDMYToISO(clientFormData.authorization.declarationDate),
          }
        : null,
      responsePDFUrl: null,
      submittedAt: null,
    };

    console.log('PUT: Calling prisma.backgroundVerificationForm.upsert...');
    const savedDraft = await prisma.backgroundVerificationForm.upsert({
      where: { formLinkToken: routeToken },
      update: dataToSave,
      create: dataToSave,
    });
    console.log('PUT: Draft upserted successfully. ID:', savedDraft.id);

    console.log('PUT: Updating FormLinks status...');
    await prisma.formLinks.update({
      where: { token: routeToken },
      data: { status: 'Draft' },
    });
    console.log('PUT: FormLinks status updated to Draft.');
    console.log('--- PUT Request Processed Successfully for token:', routeToken, '---');

    return NextResponse.json({ message: 'Draft saved successfully', data: savedDraft }, { status: 200 });
  } catch (error: any) {
    console.error(`--- PUT BGV Form (Save Draft) CATCH BLOCK for token ${routeToken} ---`);
    console.error('PUT Error Full Object:', error);
    return NextResponse.json(
      { error: 'Failed to save draft', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// --- POST handler (Submit) ---
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  const routeToken = params.token;
  console.log(`\n--- POST Request Received for token: ${routeToken} at ${new Date().toISOString()} ---`);

  if (!routeToken) {
    console.error('POST Error: Token is required');
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // 1. Validate form link
    const formLink = await prisma.formLinks.findUnique({ where: { token: routeToken } });
    if (!formLink) {
      console.error(`POST Error: Invalid form link for token ${routeToken}`);
      return NextResponse.json({ error: 'Invalid form link' }, { status: 404 });
    }

    if (formLink.status === 'submitted') {
      return NextResponse.json({ error: 'Form has already been submitted.' }, { status: 409 });
    }
    if (formLink.status === 'expired') {
      return NextResponse.json({ error: 'Form link has expired.' }, { status: 410 });
    }
    const createdByUsername = formLink.createdBy || 'unknown';

    // 2. Parse form-data
    const { fields, files } = await parseNextJSFormData(req);
    const jsonDataString = fields.jsonData;
    if (!jsonDataString) {
      return NextResponse.json({ error: 'Missing jsonData field in form-data' }, { status: 400 });
    }
    const clientFormData: FrontendFormData = JSON.parse(jsonDataString);

    // 3. Validate essential data
    if (!clientFormData.email || !clientFormData.personalDetails?.fullName) {
      return NextResponse.json({ error: 'Required fields like email or full name are missing.' }, { status: 400 });
    }
    const hasNewSignatureBase64 =
      clientFormData.authorization?.signatureDataUrl?.startsWith('data:image') || false;
    const existingBgvDataForSigCheck = await prisma.backgroundVerificationForm.findUnique({
      where: { formLinkToken: routeToken },
    });
    const hasExistingSignatureUrl =
      !!existingBgvDataForSigCheck?.signatureImageUrl ||
      !!clientFormData.authorization?.signatureDataUrl;

    if (!hasNewSignatureBase64 && !hasExistingSignatureUrl) {
      return NextResponse.json({ error: 'Signature is required for submission.' }, { status: 400 });
    }

    // 4. Process files (passport photo, signature, documents)
    let passportPhotoUrl: string | undefined = clientFormData.personalDetails?.passportPhoto?.fileUrl;
    const passportPhotoApiFile = files['passportPhotoFile']?.[0];
    if (passportPhotoApiFile) {
      const saved = await saveUploadedFile(passportPhotoApiFile, 'passport_photos');
      passportPhotoUrl = saved.url;
    }

    let signatureImageUrl: string | undefined;
    if (hasNewSignatureBase64 && clientFormData.authorization?.signatureDataUrl) {
      const savedSignature = await saveBase64AsImage(
        clientFormData.authorization.signatureDataUrl,
        'signatures',
        `sig_${routeToken}_final`
      );
      if (savedSignature) signatureImageUrl = savedSignature.url;
    } else if (hasExistingSignatureUrl) {
      signatureImageUrl =
        clientFormData.authorization?.signatureDataUrl ||
        existingBgvDataForSigCheck?.signatureImageUrl ||
        undefined;
    }
    if (!signatureImageUrl) {
      return NextResponse.json({ error: 'Signature processing failed.' }, { status: 500 });
    }

    // --- Docs processing helper ---
    const processUploadedDocuments = async (
      docClientArray: FrontendDocumentFile[] | undefined,
      fileKeyPrefix: string,
      subfolder: string,
      existingDbDocsForEntry?: any[]
    ): Promise<
      { id: string | number; documentType?: string; fileUrl: string; originalFilename?: string }[]
    > => {
      if (!docClientArray) return existingDbDocsForEntry || [];
      const processedDbDocs: {
        id: string | number;
        documentType?: string;
        fileUrl: string;
        originalFilename?: string;
      }[] = [];
      const existingDocsMap = new Map(
        existingDbDocsForEntry?.map((d: any) => [d.id || d.fileUrl, d]) || []
      );
      for (let i = 0; i < docClientArray.length; i++) {
        const clientDocInfo = docClientArray[i];
        let finalFileUrl =
          clientDocInfo.fileUrl ||
          existingDocsMap.get(clientDocInfo.id || clientDocInfo.fileUrl)?.fileUrl;
        let finalOriginalFilename =
          clientDocInfo.fileName ||
          existingDocsMap.get(clientDocInfo.id || clientDocInfo.fileUrl)?.originalFilename;
        const parsedFile = files[`${fileKeyPrefix}_${i}`]?.[0];
        if (parsedFile) {
          const savedNewFile = await saveUploadedFile(parsedFile, subfolder);
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

    const existingBgvData = await prisma.backgroundVerificationForm.findUnique({
      where: { formLinkToken: routeToken },
    });

    const dbAddressDocs = await processUploadedDocuments(
      clientFormData.addressVerification?.uploadedDocuments,
      'addressDoc',
      'address_proofs',
      existingBgvData?.addressVerification
        ? (existingBgvData.addressVerification as any).uploadedDocuments
        : []
    );

    const dbEducationEntries: any[] = [];
    if (clientFormData.educationVerification) {
      for (let i = 0; i < clientFormData.educationVerification.length; i++) {
        const entry = clientFormData.educationVerification[i];
        const existingEntryDocs = (existingBgvData?.educationVerification as any[])?.find(
          (e) => e.id === entry.id
        )?.uploadedDocuments;
        const docs = await processUploadedDocuments(
          entry.uploadedDocuments,
          `education_${i}_doc`,
          'education_proofs',
          existingEntryDocs
        );
        dbEducationEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `edu_${Date.now()}` });
      }
    }

    const dbEmploymentEntries: any[] = [];
    if (clientFormData.employmentVerification) {
      for (let i = 0; i < clientFormData.employmentVerification.length; i++) {
        const entry = clientFormData.employmentVerification[i];
        const existingEntryDocs = (existingBgvData?.employmentVerification as any[])?.find(
          (e) => e.id === entry.id
        )?.uploadedDocuments;
        const docs = await processUploadedDocuments(
          entry.uploadedDocuments,
          `employment_${i}_doc`,
          'employment_proofs',
          existingEntryDocs
        );
        dbEmploymentEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `emp_${Date.now()}` });
      }
    }

    const dbIdentityEntries: any[] = [];
    if (clientFormData.identityVerification) {
      for (let i = 0; i < clientFormData.identityVerification.length; i++) {
        const entry = clientFormData.identityVerification[i];
        const existingEntryDocs = (existingBgvData?.identityVerification as any[])?.find(
          (e) => e.id === entry.id
        )?.uploadedDocuments;
        const docs = await processUploadedDocuments(
          entry.uploadedDocuments,
          `identity_${i}_doc`,
          'identity_proofs',
          existingEntryDocs
        );
        dbIdentityEntries.push({ ...entry, uploadedDocuments: docs, id: entry.id || `idt_${Date.now()}` });
      }
    }

    // --- PDF Generation STARTS HERE ---
    const candidateName =
      clientFormData.personalDetails?.fullName?.replace(/\s+/g, '_') || 'bgv';
    const pdfName = `${candidateName}_bgv.pdf`;
    const pdfDir = path.join(process.cwd(), 'public', 'bgv');
    const pdfPath = path.join(pdfDir, pdfName);
    const pdfUrl = `/bgv/${pdfName}`;
    await fs.mkdir(pdfDir, { recursive: true });
    await generateBgvPdf(clientFormData, pdfPath);

    // --- Prepare Data to Save ---
    const dataToSave: Omit<
      BackgroundVerificationForm,
      'id' | 'createdAt' | 'updatedAt' | 'formLinkToken'
    > & { formLinkToken: string } = {
      formLinkToken: routeToken,
      status: 'submitted',
      clicked: true,
      draftExpiresAt: null,
      email: clientFormData.email || null,
      mobile: clientFormData.mobile || null,
      alternateMobile: clientFormData.alternateMobile || null,
      passportPhotoUrl: passportPhotoUrl || null,
      signatureImageUrl: signatureImageUrl,
      personalDetails: clientFormData.personalDetails
        ? {
            ...clientFormData.personalDetails,
            passportPhoto: undefined,
            dob: clientFormData.personalDetails.dob
              ? new Date(clientFormData.personalDetails.dob).toISOString()
              : null,
          }
        : null,
      addressVerification: clientFormData.addressVerification
        ? {
            ...clientFormData.addressVerification,
            uploadedDocuments: dbAddressDocs,
          }
        : null,
      educationVerification: dbEducationEntries.length > 0 ? dbEducationEntries : null,
      employmentVerification: dbEmploymentEntries.length > 0 ? dbEmploymentEntries : null,
      identityVerification: dbIdentityEntries.length > 0 ? dbIdentityEntries : null,
      authorization: clientFormData.authorization
        ? {
            ...clientFormData.authorization,
            signatureDataUrl: undefined,
            declarationDate: parseDMYToISO(clientFormData.authorization.declarationDate),
          }
        : null,
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
        status: 'submitted',
        candidateName: clientFormData.personalDetails?.fullName || formLink.candidateName,
        responsePDF: pdfUrl,
      },
    });

    return NextResponse.json({ message: 'Form submitted successfully', data: submittedForm }, { status: 200 });
  } catch (error: any) {
    console.error('--- POST BGV Form (Submit) Error ---', error);
    return NextResponse.json(
      { error: 'Failed to submit form', details: error.message || String(error) },
      { status: 500 }
    );
  }
}
