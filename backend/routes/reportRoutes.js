import express from 'express';
import {
  uploadReportFile,
  getReportById,
  processReport,
  verifyReport,
  resolveReportIdentity,
  addManualLabResult,
  extractIntakePreview,
} from '../controllers/reportController.js';
import { verifyAuth } from '../middleware/authMiddleware.js';
import { uploadReport } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(verifyAuth);

router.post('/upload', uploadReport.single('file'), uploadReportFile);
router.post('/extract-preview', uploadReport.single('file'), extractIntakePreview);
router.get('/:id', getReportById);
router.post('/:id/process', processReport);
router.post('/:id/verify', verifyReport);
router.post('/:id/resolve-identity', resolveReportIdentity);
router.post('/:id/manual-result', addManualLabResult);

export default router;
