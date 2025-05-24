
import express from 'express';
import prisma from '../prisma';

const router = express.Router();

// Get dashboard stats
router.get('/', async (req, res) => {
  try {
    // Get all counts in parallel
    const [
      totalUsers,
      totalAdmins,
      totalQuestions,
      totalExams,
      publishedExams,
      draftExams,
      totalResults,
      passedResults,
      recentExams,
      recentResults
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.question.count(),
      prisma.exam.count(),
      prisma.exam.count({ where: { status: 'published' } }),
      prisma.exam.count({ where: { status: 'draft' } }),
      prisma.examResult.count(),
      prisma.examResult.count({ where: { status: 'passed' } }),
      prisma.exam.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { questions: true }
      }),
      prisma.examResult.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              name: true
            }
          },
          exam: true
        }
      })
    ]);
    
    // Calculate pass rate
    const passRate = totalResults > 0 ? (passedResults / totalResults) * 100 : 0;
    
    const stats = {
      totalUsers,
      totalAdmins,
      totalStudents: totalUsers - totalAdmins,
      totalQuestions,
      totalExams,
      publishedExams,
      draftExams,
      totalResults,
      passRate,
      recentExams,
      recentResults
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
});

export const dashboardRoutes = router;
