import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

import patientRoutes from './routes/patientRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'MedLens Clinical Intelligence Backend',
    timestamp: new Date(),
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE'),
    firebaseConfigured: !!(process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
  });
});

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/demo', dashboardRoutes); // Alias for convenience

// Serve production static frontend if available
const frontendDistPath = path.join(__dirname, '../frontend/dist');
const backendPublicPath = path.join(__dirname, 'public');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else if (fs.existsSync(backendPublicPath)) {
  app.use(express.static(backendPublicPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(backendPublicPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  if (err.message && err.message.includes('Unsupported file format')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds maximum allowable limit of 15MB.',
    });
  }

  res.status(500).json({
    success: false,
    message: 'An unexpected clinical server error occurred. Please verify inputs or try again.',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MedLens Backend running on port ${PORT}`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
});