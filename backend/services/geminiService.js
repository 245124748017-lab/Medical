import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { validateReferenceRange } from '../utils/referenceValidator.js';

// Read API key strictly from process.env.GEMINI_API_KEY
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey.trim());
};

// Target model: gemini-3.1-flash-lite (explicitly avoiding 2.5 models)
const GEMINI_MODEL_NAME = 'gemini-3.1-flash-lite';

// Helper to sanitize error messages so API keys are never exposed in UI or logs
const sanitizeError = (rawMessage) => {
  if (!rawMessage) return 'Unknown error occurred during clinical document processing.';
  
  // Remove any query string parameters or potential API keys
  let clean = rawMessage.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
  clean = clean.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  clean = clean.replace(/AQ\.[0-9A-Za-z-_]{30,}/g, '[REDACTED_API_KEY]');

  if (clean.includes('403') || clean.includes('denied access') || clean.includes('Forbidden')) {
    return 'Gemini API returned [403 Forbidden: Project Denied Access]. Your Google Cloud project has been restricted. Please create an API key in a brand new project in Google AI Studio (aistudio.google.com) and update GEMINI_API_KEY in Render.';
  }
  if (clean.includes('429') || clean.includes('quota') || clean.includes('Resource has been exhausted')) {
    return 'Gemini API rate limit or quota exceeded. Please verify your Google AI Studio quota.';
  }
  if (clean.includes('404') || clean.includes('not found')) {
    return `Model ${GEMINI_MODEL_NAME} is not available on this API key or region.`;
  }
  if (clean.includes('API key not valid') || clean.includes('API_KEY_INVALID')) {
    return 'Provided GEMINI_API_KEY is invalid or expired. Please check backend/.env.';
  }

  return clean;
};

// Realistic mock extraction for safe demonstration and fallback
export const getFallbackDemoExtraction = (fileName = 'sample_report.pdf', isFallbackDueToError = false, errorReason = null) => {
  return {
    patientInfo: {
      name: 'Robert Vance',
      age: 45, // Intentionally 45 to demo conflict detection against profile age 42
      sex: 'Male',
      reportDate: '2026-09-02',
    },
    tests: [
      {
        testName: 'Hemoglobin',
        value: 11.2,
        numericValue: 11.2,
        unit: 'g/dL',
        referenceRange: {
          min: 12.0,
          max: 16.0,
          rawText: '12.0 - 16.0 g/dL',
        },
        status: 'LOW',
        observation: 'Below the reference range stated in the report (12.0 - 16.0 g/dL).',
        confidence: 0.98,
        source: 'AI_EXTRACTED',
      },
      {
        testName: 'Fasting Blood Glucose',
        value: 128,
        numericValue: 128,
        unit: 'mg/dL',
        referenceRange: {
          min: 70,
          max: 99,
          rawText: '70 - 99 mg/dL',
        },
        status: 'HIGH',
        observation: 'Above the reference range stated in the report (70 - 99 mg/dL).',
        confidence: 0.97,
        source: 'AI_EXTRACTED',
      },
      {
        testName: 'Platelet Count',
        value: 245,
        numericValue: 245,
        unit: '10^3/µL',
        referenceRange: {
          min: 150,
          max: 450,
          rawText: '150 - 450 10^3/µL',
        },
        status: 'NORMAL',
        observation: 'Within the reference range stated in the report (150 - 450 10^3/µL).',
        confidence: 0.99,
        source: 'AI_EXTRACTED',
      },
      {
        testName: 'Serum Ferritin',
        value: 18.5,
        numericValue: 18.5,
        unit: 'ng/mL',
        referenceRange: null, // Strictly null when not in source report
        status: 'CANNOT_DETERMINE', // Strictly CANNOT_DETERMINE when no reference range
        observation: 'Reference range not provided in source report. Status cannot be determined.',
        confidence: 0.94,
        source: 'AI_EXTRACTED',
      },
      {
        testName: 'Total Cholesterol',
        value: 192,
        numericValue: 192,
        unit: 'mg/dL',
        referenceRange: {
          min: null,
          max: 200,
          rawText: '< 200 mg/dL',
        },
        status: 'NORMAL',
        observation: 'Within source reference range (< 200 mg/dL).',
        confidence: 0.96,
        source: 'AI_EXTRACTED',
      },
    ],
    isDemoFallback: true,
    errorReason: errorReason || (isFallbackDueToError ? 'AI service temporarily unavailable' : 'Safe demonstration mode'),
    warning: 'DEMO DATA — NOT EXTRACTED FROM A REAL REPORT',
  };
};

// Resolves appropriate MIME type from file extension if not provided
const resolveMimeType = (filePath, mimeType) => {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/pdf';
};

export const extractReportWithGemini = async (filePath, mimeType, originalName) => {
  const genAI = getGeminiClient();

  if (!genAI) {
    const error = new Error('AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.');
    error.code = 'AI_PROCESSING_UNAVAILABLE';
    error.safeReason = 'GEMINI_API_KEY is not configured in backend/.env.';
    throw error;
  }

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Report document file not found at path: ${filePath}`);
    }
    const resolvedMime = resolveMimeType(filePath, mimeType);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    console.log(`[Gemini Request] Sending document (${resolvedMime}, ${(fileBuffer.length / 1024).toFixed(1)} KB) to model: ${GEMINI_MODEL_NAME}`);

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    const prompt = `
You are MedLens Clinical Information Extraction AI running model ${GEMINI_MODEL_NAME}.
You convert uploaded medical reports (PDF, PNG, JPG, JPEG) into structured, traceable clinical data.

STRICT EXTRACTION RULES:
1. Extract ONLY information explicitly present in the source report.
2. NEVER invent, extrapolate, or assume patient information or clinical values.
3. PATIENT DEMOGRAPHICS EXTRACTION:
   - "patientName": Full patient name as explicitly printed in the report, or null if not found.
   - "age": Patient age as a number (e.g. 45), or null if not explicitly printed.
   - "sex": Patient sex/gender ("Male", "Female", "Other") if explicitly printed, or null.
   - "dob": Date of birth if explicitly present (YYYY-MM-DD or string), or null.
   - "reportDate": Date of report/specimen collection (YYYY-MM-DD), or null.
4. STRICT REFERENCE RANGE RULE:
   - Only use reference ranges explicitly present in the uploaded report.
   - If a test in the report contains an explicit reference range, extract:
     "referenceRange": { "min": number or null, "max": number or null, "rawText": string }
   - If NO reference range exists in the report for a test:
     "referenceRange": null
     "status": "CANNOT_DETERMINE"
   - NEVER invent or assume a reference range under any circumstances.
5. Determine status strictly against the source range:
   - "LOW" if value is strictly below the source minimum
   - "HIGH" if value is strictly above the source maximum
   - "NORMAL" if value is within source range
   - "CANNOT_DETERMINE" if no reference range exists in the source report
6. Preserve units exactly as written in the report.
7. Assign a confidence score between 0.0 and 1.0 based on document legibility.
8. Set source to "AI_EXTRACTED".
9. SAFETY DIRECTIVES:
   - DO NOT provide medical diagnosis or treatment advice.
   - Maintain strict clinical neutrality.

Return STRICT JSON ONLY, with no markdown formatting or commentary:
{
  "patientInfo": {
    "patientName": string or null,
    "name": string or null,
    "age": number or null,
    "sex": string or null,
    "dob": string or null,
    "reportDate": "YYYY-MM-DD" or null
  },
  "tests": [
    {
      "testName": string,
      "value": number or string,
      "unit": string,
      "referenceRange": {
        "min": number or null,
        "max": number or null,
        "rawText": string
      } or null,
      "status": "LOW" | "NORMAL" | "HIGH" | "CANNOT_DETERMINE",
      "observation": string,
      "confidence": number,
      "source": "AI_EXTRACTED"
    }
  ]
}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: resolvedMime,
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();
    const cleanedText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedData = JSON.parse(cleanedText);

    // Normalize patient demographics
    const pInfo = parsedData.patientInfo || {};
    const patientName = pInfo.patientName || pInfo.name || null;
    const age = typeof pInfo.age === 'number' ? pInfo.age : (pInfo.age ? parseInt(pInfo.age, 10) : null);
    const sex = pInfo.sex || null;
    const dob = pInfo.dob || pInfo.dateOfBirth || null;
    const reportDate = pInfo.reportDate || null;

    // Validate tests and strictly enforce server-side reference range rule
    const validatedTests = (parsedData.tests || []).map((t) => {
      const validation = validateReferenceRange(t.value, t.referenceRange);
      return {
        testName: t.testName || 'Unknown Test',
        value: t.value,
        numericValue: typeof t.value === 'number' ? t.value : parseFloat(t.value) || null,
        unit: t.unit || '',
        referenceRange: validation.referenceRange, // strictly null if not in source
        status: validation.status === 'UNKNOWN' ? 'CANNOT_DETERMINE' : validation.status,
        observation: validation.observation || t.observation || '',
        confidence: typeof t.confidence === 'number' ? Math.min(1, Math.max(0, t.confidence)) : 0.95,
        source: 'AI_EXTRACTED',
      };
    });

    console.log(`[Gemini Success] Successfully extracted ${validatedTests.length} tests from document via ${GEMINI_MODEL_NAME}`);

    return {
      patientInfo: {
        patientName,
        name: patientName,
        age,
        sex,
        dob,
        reportDate,
      },
      tests: validatedTests,
      isDemoFallback: false,
      errorReason: null,
    };
  } catch (err) {
    const safeReason = sanitizeError(err.message || err.toString());
    console.warn(`[Gemini ${GEMINI_MODEL_NAME} Notice]:`, safeReason);

    // Do NOT fake successful Gemini extraction or inject simulated test data.
    // Throw clean AI_PROCESSING_UNAVAILABLE error for caller to handle.
    const error = new Error('AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.');
    error.code = 'AI_PROCESSING_UNAVAILABLE';
    error.safeReason = safeReason;
    throw error;
  }
};

export const extractPatientDemographicsOnly = async (filePath, mimeType) => {
  const genAI = getGeminiClient();

  if (!genAI) {
    const error = new Error('AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.');
    error.code = 'AI_PROCESSING_UNAVAILABLE';
    error.safeReason = 'GEMINI_API_KEY is not configured in backend/.env.';
    throw error;
  }

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Document file not found at path: ${filePath}`);
    }
    const resolvedMime = resolveMimeType(filePath, mimeType);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    const prompt = `
You are MedLens Clinical Information Intake AI running model ${GEMINI_MODEL_NAME}.
Extract ONLY the patient demographics and document dates from the uploaded medical document.

RULES:
1. Extract ONLY information explicitly present in the document.
2. If patient name is present, extract it as "patientName".
3. If age is present, extract it as a numeric "age".
4. If sex/gender is present, extract as "sex" ("Male", "Female", "Other").
5. If date of birth is explicitly present, extract as "dob".
6. If report or specimen date is present, extract as "reportDate".
7. NEVER invent or assume any information. Return null for any missing fields.

Return STRICT JSON ONLY:
{
  "patientName": string or null,
  "age": number or null,
  "sex": string or null,
  "dob": string or null,
  "reportDate": string or null
}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: resolvedMime,
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();
    const cleanedText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedText);
    const patientName = parsed.patientName || parsed.name || null;
    const age = typeof parsed.age === 'number' ? parsed.age : (parsed.age ? parseInt(parsed.age, 10) : null);
    const sex = parsed.sex || null;
    const dob = parsed.dob || parsed.dateOfBirth || null;
    const reportDate = parsed.reportDate || null;

    return {
      patientName,
      age,
      sex,
      dob,
      reportDate,
      source: 'AI_EXTRACTED',
      provenance: 'Medical Report → AI Extracted',
    };
  } catch (err) {
    const safeReason = sanitizeError(err.message || err.toString());
    console.warn(`[Gemini Demographics Notice]:`, safeReason);
    const error = new Error('AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.');
    error.code = 'AI_PROCESSING_UNAVAILABLE';
    error.safeReason = safeReason;
    throw error;
  }
};