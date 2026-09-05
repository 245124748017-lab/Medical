import express from 'express';
import { getDashboardStats, handleSeedDemo } from '../controllers/dashboardController.js';
import { verifyAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyAuth);

router.get('/stats', getDashboardStats);
router.post('/seed', handleSeedDemo);

export default router;
