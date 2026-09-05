# MedLens — Supabase PostgreSQL Setup Guide (Free Tier)

This guide walks you through setting up the MedLens database on the **Supabase Free Plan**.

---

## Step-by-Step Instructions

### 1. Create a Supabase Free Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Enter your project details:
   - **Name**: `medlens-db` (or your preferred name)
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select the region closest to your Render backend deployment (e.g., US East / West).
   - **Pricing Plan**: **Free** ($0/month).
4. Click **Create new project** and wait ~1-2 minutes for the database to provision.

---

### 2. Run the Schema in Supabase SQL Editor
1. In the left navigation menu of your Supabase dashboard, click the **SQL Editor** icon (icon with `>_`).
2. Click **+ New query**.
3. Open the file [`supabase/schema.sql`](schema.sql) in your local project.
4. Copy the **entire contents** of `supabase/schema.sql`.
5. Paste the SQL code into the Supabase SQL Editor window.
6. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
7. You should see `Success. No rows returned` in the output pane.

---

### 3. Verify in Table Editor
1. In the left navigation menu, click **Table Editor** (grid table icon).
2. Confirm that all 5 MedLens tables are present:
   - `users`
   - `patients`
   - `medical_reports`
   - `lab_results`
   - `audit_logs`
3. Check the **Views** section and confirm the 4 convenience views:
   - `v_patients`
   - `v_medical_reports`
   - `v_lab_results`
   - `v_audit_logs`

---

### 4. Obtain Your Supabase Backend Credentials
1. In your Supabase dashboard, go to **Project Settings** (gear icon at the bottom of the left sidebar) > **API**.
2. Find the following values:
   - **Project URL**: Copy this URL (e.g., `https://abcdefghijklm.supabase.co`).
     - Set as `SUPABASE_URL` in your backend environment variables.
   - **Project API Keys** > `service_role` (secret):
     - Click **Reveal** and copy the key (starts with `eyJ...`).
     - Set as `SUPABASE_SERVICE_ROLE_KEY` in your Render backend environment variables.

> [!WARNING]
> **CRITICAL SECURITY RULE**:
> The `service_role` key has admin rights and bypasses Row Level Security.
> - ONLY set `SUPABASE_SERVICE_ROLE_KEY` in the **backend** (Render environment variables or `backend/.env`).
> - **NEVER** expose the `service_role` key in frontend code, Vercel variables, or Git.

---

## Schema Architecture Reference

```
Firebase User (users.firebase_uid)
      │
      ▼
Patient Intake (patients.id [UUID])
      │
      ├────────────────────────┬──────────────────────┐
      ▼                        ▼                      ▼
Medical Reports (UUID)   Lab Results (UUID)    Audit Logs (UUID)
      │                        ▲
      └────────────────────────┘
```

- **Foreign Keys with `ON DELETE CASCADE`**: When a patient is deleted, their associated medical reports, lab results, and audit logs are cleaned up automatically.
- **Timestamps**: All tables use `TIMESTAMPTZ` with automatic `updated_at` triggers.
- **JSONB**: Flexible storage for clinical provenance, extracted patient demographics, reference ranges, and AI summaries.
- **Zero Paid Features**: Built exclusively using standard PostgreSQL features supported on Supabase Free.
