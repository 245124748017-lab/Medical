import express from 'express';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientTimeline,
  getPatientComparison,
} from '../controllers/patientController.js';
import { verifyAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyAuth);

router.route('/')
  .get(getPatients)
  .post(createPatient);

router.route('/:id')
  .get(getPatientById)
  .put(updatePatient)
  .delete(deletePatient);

router.get('/:id/timeline', getPatientTimeline);
router.get('/:id/compare', getPatientComparison);

export default router;
