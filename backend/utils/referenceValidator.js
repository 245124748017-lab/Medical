/**
 * Strict Clinical Reference Range Validator
 * 
 * STRICT REFERENCE RANGE RULE:
 * - Only use reference ranges explicitly present in the uploaded report.
 * - If no reference range exists:
 *     referenceRange = null
 *     status = "CANNOT_DETERMINE"
 * - Never invent or assume reference ranges.
 */

export function validateReferenceRange(value, referenceRange) {
  // If no reference range object or missing rawText/bounds
  if (!referenceRange || (!referenceRange.rawText && referenceRange.min == null && referenceRange.max == null)) {
    return {
      status: 'CANNOT_DETERMINE',
      referenceRange: null,
      observation: 'Reference range not provided in source report. Status cannot be determined.',
    };
  }

  const raw = (typeof referenceRange === 'string' ? referenceRange : referenceRange.rawText || '').trim();
  const lowerRaw = raw.toLowerCase();

  if (
    !raw ||
    lowerRaw.includes('not provided') ||
    lowerRaw.includes('not available') ||
    lowerRaw.includes('n/a') ||
    lowerRaw === 'none' ||
    lowerRaw === 'null' ||
    lowerRaw === 'unspecified'
  ) {
    return {
      status: 'CANNOT_DETERMINE',
      referenceRange: null,
      observation: 'Reference range not provided in source report. Status cannot be determined.',
    };
  }

  // Parse numeric bounds if min/max not explicitly provided
  let min = referenceRange.min != null ? Number(referenceRange.min) : null;
  let max = referenceRange.max != null ? Number(referenceRange.max) : null;

  if ((min === null || isNaN(min)) && (max === null || isNaN(max))) {
    // Match formats like "12 - 16", "12.0 - 16.0", "12–16", "< 100", "> 60"
    const rangeMatch = raw.match(/([0-9.]+)\s*[-–—to]+\s*([0-9.]+)/i);
    const lessMatch = raw.match(/[<≤]\s*([0-9.]+)/);
    const greaterMatch = raw.match(/[>≥]\s*([0-9.]+)/);

    if (rangeMatch) {
      min = parseFloat(rangeMatch[1]);
      max = parseFloat(rangeMatch[2]);
    } else if (lessMatch) {
      min = 0;
      max = parseFloat(lessMatch[1]);
    } else if (greaterMatch) {
      min = parseFloat(greaterMatch[1]);
      max = null;
    }
  }

  const numVal = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(numVal)) {
    // Non-numeric qualitative value (e.g. Negative / Normal / Non-reactive)
    const valLower = String(value).toLowerCase();
    if (valLower.includes('normal') || valLower.includes('negative') || valLower.includes('non-reactive')) {
      return {
        status: 'NORMAL',
        referenceRange: { min, max, rawText: raw },
        observation: 'Within qualitative standard reported in source document.',
      };
    }
    return {
      status: 'CANNOT_DETERMINE',
      referenceRange: { min, max, rawText: raw },
      observation: 'Qualitative observation stated in source report.',
    };
  }

  // Compare strictly against source bounds
  let status = 'NORMAL';
  let observation = 'Within reference range stated in source report.';

  if (min !== null && !isNaN(min) && numVal < min) {
    status = 'LOW';
    observation = `Below the source reference range of ${raw}.`;
  } else if (max !== null && !isNaN(max) && numVal > max) {
    status = 'HIGH';
    observation = `Above the source reference range of ${raw}.`;
  } else if ((min !== null && !isNaN(min)) || (max !== null && !isNaN(max))) {
    status = 'NORMAL';
    observation = `Within source reference range of ${raw}.`;
  } else {
    status = 'CANNOT_DETERMINE';
    observation = 'Source reference range could not be parsed numerically.';
  }

  return {
    status,
    referenceRange: {
      min: isNaN(min) ? null : min,
      max: isNaN(max) ? null : max,
      rawText: raw,
    },
    observation,
  };
}