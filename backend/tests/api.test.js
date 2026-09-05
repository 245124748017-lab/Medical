import request from 'supertest';
import app from '../app.js';

describe('MedLens Clinical Information Organizer — Automated Backend Test Suite', () => {
  const DEMO_TOKEN = 'Bearer demo-token-medlens';

  // ==========================================
  // 1. HEALTH CHECK ENDPOINT
  // ==========================================
  describe('GET /api/health', () => {
    it('returns HTTP 200 with service status and health information', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('medlens-backend');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });

    it('does NOT leak sensitive credentials or internal secrets', async () => {
      const res = await request(app).get('/api/health');

      const bodyString = JSON.stringify(res.body);
      expect(bodyString).not.toMatch(/AIza[0-9A-Za-z-_]{35}/);
      expect(bodyString).not.toMatch(/AQ\.[0-9A-Za-z-_]{20,}/);
      expect(bodyString).not.toMatch(/private_key/i);
      expect(bodyString).not.toMatch(/service_role/i);
      expect(bodyString).not.toMatch(/secret/i);
    });
  });

  // ==========================================
  // 2. AUTHENTICATION MIDDLEWARE
  // ==========================================
  describe('Authentication Middleware Guard', () => {
    it('rejects unauthenticated requests to protected patient routes with 401', async () => {
      const res = await request(app).get('/api/patients');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication token is required/i);
    });

    it('rejects invalid or malformed tokens with 401', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', 'InvalidFormatToken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('accepts valid clinical authorization token', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', DEMO_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.patients)).toBe(true);
    });
  });

  // ==========================================
  // 3. PATIENT MANAGEMENT API
  // ==========================================
  describe('Patient API Endpoints', () => {
    it('rejects patient creation when required fields (name, age) are missing', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', DEMO_TOKEN)
        .send({
          // Missing name and age
          sex: 'Male',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name and age are required/i);
    });

    it('successfully creates a valid clinical patient profile', async () => {
      const newPatient = {
        name: 'Eleanor Sterling, MD Test',
        age: 52,
        sex: 'Female',
        contactPhone: '+1-555-0199',
        medicalHistoryNotes: 'Patient has baseline history of hypertension.',
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', DEMO_TOKEN)
        .send(newPatient);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.patient).toBeDefined();
      expect(res.body.patient.name).toBe('Eleanor Sterling, MD Test');
      expect(Number(res.body.patient.age)).toBe(52);
    });

    it('retrieves patient directory for the authenticated clinician', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', DEMO_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.patients)).toBe(true);
    });

    it('handles non-existent patient retrieval gracefully with 404', async () => {
      const res = await request(app)
        .get('/api/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', DEMO_TOKEN);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 4. MEDICAL REPORTS API
  // ==========================================
  describe('Medical Reports API Endpoints', () => {
    it('rejects report upload without authorization with 401', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .send({});

      expect(res.status).toBe(401);
    });

    it('rejects report upload when file is missing with 400', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', DEMO_TOKEN)
        .field('patientId', '00000000-0000-0000-0000-000000000001');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/file/i);
    });

    it('rejects preview extraction without file with 400', async () => {
      const res = await request(app)
        .post('/api/reports/extract-preview')
        .set('Authorization', DEMO_TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects viewing non-existent report verification with 404', async () => {
      const res = await request(app)
        .get('/api/reports/00000000-0000-0000-0000-000000000000/verify')
        .set('Authorization', DEMO_TOKEN);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 5. DASHBOARD & CLINICAL METRICS
  // ==========================================
  describe('Clinical Dashboard Metrics Endpoint', () => {
    it('requires authentication for dashboard metrics', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(401);
    });

    it('returns valid clinical metrics and stats structure for authenticated clinician', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', DEMO_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(typeof res.body.stats.totalPatients).toBe('number');
      expect(typeof res.body.stats.totalReports).toBe('number');
      expect(typeof res.body.stats.awaitingReview).toBe('number');
      expect(typeof res.body.stats.verifiedReports).toBe('number');
      expect(Array.isArray(res.body.recentPatients)).toBe(true);
      expect(Array.isArray(res.body.recentActivity)).toBe(true);
    });
  });

  // ==========================================
  // 6. ERROR HANDLING & ROUTE NOT FOUND
  // ==========================================
  describe('Global Error Handling & Fallbacks', () => {
    it('returns a clean JSON 404 for undefined API endpoints', async () => {
      const res = await request(app).get('/api/non-existent-endpoint-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/API endpoint not found/i);
    });

    it('handles unexpected internal errors safely without leaking stack traces', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', DEMO_TOKEN)
        .set('Content-Type', 'application/json')
        .send('{"badJson": invalid}');

      // Express built-in parser catches invalid JSON syntax
      expect([400, 500]).toContain(res.status);
      const resText = JSON.stringify(res.body);
      expect(resText).not.toMatch(/node_modules/i);
      expect(resText).not.toMatch(/Error:.*at\s+/);
    });
  });
});
