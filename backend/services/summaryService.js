import { GoogleGenerativeAI } from '@google/generative-ai';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey.trim());
};

const GEMINI_MODEL_NAME = 'gemini-3.1-flash-lite';

export const generatePatientSummary = async (tests = [], patientName = 'Patient') => {
  const genAI = getGeminiClient();

  const totalTests = tests.length;
  const abnormalTests = tests.filter((t) => t.status === 'LOW' || t.status === 'HIGH');
  const normalTests = tests.filter((t) => t.status === 'NORMAL');
  const unknownTests = tests.filter((t) => t.status === 'CANNOT_DETERMINE' || t.status === 'UNKNOWN');

  // Rule-based compliant summary generator (used if Gemini key is unconfigured or call fails)
  const generateRuleBasedSummary = () => {
    let summaryText = `This report contains ${totalTests} laboratory parameter(s). `;
    if (normalTests.length > 0) {
      summaryText += `${normalTests.length} of the reported values fall within the reference intervals stated in the source testing document. `;
    }

    if (abnormalTests.length > 0) {
      const abnormalDetails = abnormalTests
        .map(
          (t) =>
            `${t.testName} (${t.value} ${t.unit}, stated as ${t.status.toLowerCase()} relative to source reference ${
              t.referenceRange?.rawText || 'unspecified'
            })`
        )
        .join(', ');
      summaryText += `${abnormalTests.length} result(s) are outside the laboratory reference ranges printed on the report: ${abnormalDetails}. `;
    }

    if (unknownTests.length > 0) {
      const unkNames = unknownTests.map((t) => t.testName).join(', ');
      summaryText += `For ${unknownTests.length} test(s) (${unkNames}), the source report did not provide a reference range, meaning clinical status cannot be determined from this document alone. `;
    }

    summaryText +=
      'These results should be reviewed together with your complete medical history by a qualified healthcare professional.';

    return {
      text: summaryText,
      keyObservations: [
        `Total tests analyzed: ${totalTests}`,
        `${normalTests.length} test(s) within source reference intervals`,
        `${abnormalTests.length} test(s) outside source reference intervals`,
        unknownTests.length > 0
          ? `${unknownTests.length} test(s) missing reference ranges in source document (Status: Cannot Determine)`
          : 'All tests included source reference ranges',
      ],
      abnormalFindings: abnormalTests.map(
        (t) => `${t.testName}: ${t.value} ${t.unit} (Status: ${t.status})`
      ),
      missingInformation: unknownTests.map(
        (t) => `${t.testName}: Reference range not provided in source document`
      ),
      disclaimer:
        'AI-generated summary — verify important information with a qualified healthcare professional. Not for medical diagnosis or treatment.',
      generatedAt: new Date(),
    };
  };

  if (!genAI) {
    return generateRuleBasedSummary();
  }

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    const prompt = `
You are MedLens AI Patient-Friendly Clinical Summarizer running model ${GEMINI_MODEL_NAME}.
Your role is to summarize verified laboratory results in clear, understandable language for the patient and clinical reviewer.

STRICT CLINICAL SAFETY RULES:
1. DO NOT diagnose any illness, condition, or disease.
2. DO NOT recommend or prescribe medications.
3. DO NOT recommend dosage adjustments.
4. DO NOT recommend treatments.
5. DO NOT present uncertain or missing information as fact.
6. Emphasize that all findings must be interpreted by a qualified healthcare professional.
7. Clearly state which tests are outside the source report's reference ranges, and which tests did not have reference ranges in the source report.
8. Explain common medical terms in everyday language.

Extracted test results:
${JSON.stringify(
  tests.map((t) => ({
    test: t.testName,
    value: t.value,
    unit: t.unit,
    status: t.status,
    sourceRange: t.referenceRange?.rawText || 'Not provided in source report',
    observation: t.observation,
  })),
  null,
  2
)}

Return STRICT JSON ONLY, matching:
{
  "text": "A clear, respectful 2-3 paragraph summary following all safety guidelines...",
  "keyObservations": ["bullet 1", "bullet 2"],
  "abnormalFindings": ["bullet 1", "bullet 2"],
  "missingInformation": ["bullet 1"],
  "disclaimer": "AI-generated summary — verify important information with a qualified healthcare professional."
}
`;

    const response = await model.generateContent(prompt);
    const cleaned = response.response
      .text()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    parsed.generatedAt = new Date();
    parsed.disclaimer =
      parsed.disclaimer ||
      'AI-generated summary — verify important information with a qualified healthcare professional.';
    return parsed;
  } catch (err) {
    console.warn(`Gemini summary generation (${GEMINI_MODEL_NAME}) notice, using compliant rule-based summary:`, err.message);
    return generateRuleBasedSummary();
  }
};