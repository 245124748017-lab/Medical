import Patient from '../models/Patient.js';
import MedicalReport from '../models/MedicalReport.js';
import LabResult from '../models/LabResult.js';
import AuditLog from '../models/AuditLog.js';
import { seedDemoData } from '../utils/demoSeeder.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.uid;

    const [totalPatients, totalReports, awaitingReview, verifiedReports, totalLabResults, recentPatients, recentActivity] =
      await Promise.all([
        Patient.countDocuments({ userId }),
        MedicalReport.countDocuments({}),
        MedicalReport.countDocuments({ verificationStatus: 'PENDING' }),
        MedicalReport.countDocuments({ verificationStatus: 'VERIFIED' }),
        LabResult.countDocuments({}),
        Patient.find({ userId })
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean(),
        AuditLog.find({ userId })
          .sort({ timestamp: -1 })
          .limit(8)
          .populate('patientId', 'name')
          .lean(),
      ]);

    // Enrich recent patients with report counts
    const patientIds = recentPatients.map((p) => p._id);
    const reportCounts = await MedicalReport.aggregate([
      { $match: { patientId: { $in: patientIds } } },
      { $group: { _id: '$patientId', count: { $sum: 1 } } },
    ]);

    const reportCountMap = {};
    reportCounts.forEach((r) => {
      reportCountMap[r._id.toString()] = r.count;
    });

    const enrichedRecentPatients = recentPatients.map((p) => ({
      ...p,
      reportCount: reportCountMap[p._id.toString()] || 0,
    }));

    const aiProcessedReports = Math.max(0, totalReports - awaitingReview);

    res.json({
      success: true,
      stats: {
        totalPatients,
        totalReports,
        totalLabResults,
        awaitingReview,
        verifiedReports,
        aiProcessedReports,
      },
      recentPatients: enrichedRecentPatients,
      recentActivity,
    });
  } catch (error) {
    console.error('getDashboardStats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics.' });
  }
};

export const handleSeedDemo = async (req, res) => {
  try {
    const userId = req.user.uid;
    const result = await seedDemoData(userId);
    res.json({
      success: true,
      message: 'Hackathon demonstration dataset successfully generated.',
      data: {
        patientId: result.patient._id,
        patientName: result.patient.name,
        reportsCreated: 2,
      },
    });
  } catch (error) {
    console.error('handleSeedDemo Error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed demo data.' });
  }
};
