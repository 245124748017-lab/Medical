-- ============================================================================
-- MedLens – AI Clinical Record Organizer
-- Supabase PostgreSQL Schema (Free Tier Compatible)
-- ============================================================================

-- 1. Enable standard UUID extension (available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Clean Idempotent Setup (Drop views if exist to allow clean table re-creation)
-- ============================================================================
DROP VIEW IF EXISTS v_audit_logs CASCADE;
DROP VIEW IF EXISTS v_lab_results CASCADE;
DROP VIEW IF EXISTS v_medical_reports CASCADE;
DROP VIEW IF EXISTS v_patients CASCADE;

-- ============================================================================
-- 3. Trigger Function for Automatic updated_at Timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. USERS TABLE
-- Stores authenticated clinician profiles linked to Firebase Auth UID
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Clinical Reviewer',
  role TEXT NOT NULL DEFAULT 'clinician' CHECK (role IN ('clinician', 'reviewer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. PATIENTS TABLE
-- Stores patient directory, baseline clinical intake, and provenance tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Associated Firebase UID
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 130),
  sex TEXT NOT NULL DEFAULT 'Male' CHECK (sex IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  date_of_birth TEXT DEFAULT '',
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'USER_PROVIDED', -- 'USER_PROVIDED' or 'AI_EXTRACTED'
  field_provenance JSONB NOT NULL DEFAULT '{
    "name": "USER_PROVIDED",
    "age": "USER_PROVIDED",
    "sex": "USER_PROVIDED",
    "dateOfBirth": "USER_PROVIDED"
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients (user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (name);
CREATE INDEX IF NOT EXISTS idx_patients_updated_at ON patients (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients (created_at DESC);

DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. MEDICAL REPORTS TABLE
-- Stores uploaded clinical document metadata, AI parsing state, and summaries
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  report_date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    processing_status IN (
      'PENDING',
      'UPLOADING',
      'ANALYZING',
      'EXTRACTING',
      'VALIDATING',
      'READY_FOR_REVIEW',
      'VERIFIED',
      'FAILED',
      'AI_PROCESSING_UNAVAILABLE'
    )
  ),
  identity_status TEXT NOT NULL DEFAULT 'MATCHED' CHECK (
    identity_status IN (
      'MATCHED',
      'MISMATCH_PENDING',
      'MISMATCH_RESOLVED',
      'UNVERIFIED'
    )
  ),
  extracted_patient_info JSONB NOT NULL DEFAULT '{
    "patientName": null,
    "name": null,
    "age": null,
    "sex": null,
    "dob": null,
    "date": null,
    "rawTextSnippet": ""
  }'::jsonb,
  summary JSONB NOT NULL DEFAULT '{
    "text": "",
    "keyObservations": [],
    "abnormalFindings": [],
    "missingInformation": [],
    "disclaimer": "AI-generated summary — verify important information with a qualified healthcare professional. Not for medical diagnosis or treatment.",
    "generatedAt": null
  }'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    verification_status IN (
      'PENDING',
      'PARTIALLY_VERIFIED',
      'VERIFIED',
      'REJECTED'
    )
  ),
  is_demo_fallback BOOLEAN NOT NULL DEFAULT false,
  demo_fallback_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_reports_patient_id ON medical_reports (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_report_date ON medical_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_reports_uploaded_at ON medical_reports (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_reports_processing_status ON medical_reports (processing_status);
CREATE INDEX IF NOT EXISTS idx_medical_reports_verification_status ON medical_reports (verification_status);

DROP TRIGGER IF EXISTS trg_medical_reports_updated_at ON medical_reports;
CREATE TRIGGER trg_medical_reports_updated_at
  BEFORE UPDATE ON medical_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. LAB RESULTS TABLE
-- Stores individual diagnostic laboratory parameters, numeric values,
-- clinical reference ranges, out-of-bounds statuses, and provenance trails
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES medical_reports(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  value TEXT NOT NULL, -- Stores string or numeric representation (e.g. "11.2", "Negative")
  numeric_value NUMERIC DEFAULT NULL, -- Structured numeric value for trend charts & deltas
  unit TEXT NOT NULL DEFAULT '',
  reference_range JSONB DEFAULT NULL, -- Structured { min, max, rawText } or null
  status TEXT NOT NULL DEFAULT 'CANNOT_DETERMINE' CHECK (
    status IN ('LOW', 'NORMAL', 'HIGH', 'UNKNOWN', 'CANNOT_DETERMINE')
  ),
  observation TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.950 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'AI_EXTRACTED' CHECK (
    source IN ('USER_PROVIDED', 'AI_EXTRACTED', 'AI_GENERATED', 'HUMAN_VERIFIED')
  ),
  provenance_trail JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { stage, timestamp, actor, note }
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by TEXT DEFAULT NULL,
  verified_at TIMESTAMPTZ DEFAULT NULL,
  is_rejected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_report_id ON lab_results (report_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test_name ON lab_results (test_name);
CREATE INDEX IF NOT EXISTS idx_lab_results_is_rejected ON lab_results (is_rejected);
CREATE INDEX IF NOT EXISTS idx_lab_results_status ON lab_results (status);
CREATE INDEX IF NOT EXISTS idx_lab_results_created_at ON lab_results (created_at DESC);

DROP TRIGGER IF EXISTS trg_lab_results_updated_at ON lab_results;
CREATE TRIGGER trg_lab_results_updated_at
  BEFORE UPDATE ON lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. AUDIT LOGS TABLE
-- Stores complete regulatory audit trail for clinician edits, AI extractions,
-- and verification events
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Firebase UID of actor
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  report_id UUID REFERENCES medical_reports(id) ON DELETE SET NULL DEFAULT NULL,
  lab_result_id UUID REFERENCES lab_results(id) ON DELETE SET NULL DEFAULT NULL,
  action TEXT NOT NULL CHECK (
    action IN (
      'CREATE',
      'UPLOAD',
      'EXTRACT',
      'EDIT',
      'VERIFY',
      'REJECT',
      'SUMMARY_GENERATED',
      'RESOLVE_CONFLICT',
      'AI_PROCESSING_UNAVAILABLE'
    )
  ),
  field_changed TEXT DEFAULT NULL,
  old_value JSONB DEFAULT NULL,
  new_value JSONB DEFAULT NULL,
  comment TEXT NOT NULL DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON audit_logs (patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_report_id ON audit_logs (report_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_lab_result_id ON audit_logs (lab_result_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Protects data so only the authenticated backend using SUPABASE_SERVICE_ROLE_KEY
-- has access. Anonymous / public requests are blocked by default.
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service_role complete read/write access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'service_role_users_all') THEN
    CREATE POLICY service_role_users_all ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'service_role_patients_all') THEN
    CREATE POLICY service_role_patients_all ON patients FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medical_reports' AND policyname = 'service_role_reports_all') THEN
    CREATE POLICY service_role_reports_all ON medical_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_results' AND policyname = 'service_role_results_all') THEN
    CREATE POLICY service_role_results_all ON lab_results FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'service_role_audit_all') THEN
    CREATE POLICY service_role_audit_all ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 10. FRONTEND COMPATIBILITY VIEWS
-- Projects both camelCase and _id aliases to ensure 100% seamless compatibility
-- with existing React frontend components and API responses.
-- ============================================================================
CREATE OR REPLACE VIEW v_patients AS
SELECT
  id,
  id AS "_id",
  user_id AS "userId",
  name,
  age,
  sex,
  date_of_birth AS "dateOfBirth",
  symptoms,
  conditions,
  allergies,
  medications,
  notes,
  source,
  field_provenance AS "fieldProvenance",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM patients;

CREATE OR REPLACE VIEW v_medical_reports AS
SELECT
  id,
  id AS "_id",
  patient_id AS "patientId",
  file_name AS "fileName",
  file_type AS "fileType",
  file_path AS "filePath",
  file_size AS "fileSize",
  report_date AS "reportDate",
  uploaded_at AS "uploadedAt",
  processing_status AS "processingStatus",
  identity_status AS "identityStatus",
  extracted_patient_info AS "extractedPatientInfo",
  summary,
  verification_status AS "verificationStatus",
  is_demo_fallback AS "isDemoFallback",
  demo_fallback_reason AS "demoFallbackReason",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM medical_reports;

CREATE OR REPLACE VIEW v_lab_results AS
SELECT
  id,
  id AS "_id",
  report_id AS "reportId",
  patient_id AS "patientId",
  test_name AS "testName",
  value,
  numeric_value AS "numericValue",
  unit,
  reference_range AS "referenceRange",
  status,
  observation,
  confidence,
  source,
  provenance_trail AS "provenanceTrail",
  verified,
  verified_by AS "verifiedBy",
  verified_at AS "verifiedAt",
  is_rejected AS "isRejected",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM lab_results;

CREATE OR REPLACE VIEW v_audit_logs AS
SELECT
  id,
  id AS "_id",
  user_id AS "userId",
  patient_id AS "patientId",
  report_id AS "reportId",
  lab_result_id AS "labResultId",
  action,
  field_changed AS "fieldChanged",
  old_value AS "oldValue",
  new_value AS "newValue",
  comment,
  timestamp
FROM audit_logs;
