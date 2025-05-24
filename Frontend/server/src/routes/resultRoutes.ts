
import express from 'express';
import prisma from '../prisma';

const router = express.Router();

// Get all exam results
router.get('/', async (req, res) => {
  try {
    const results = await prisma.examResult.findMany({
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
    });
    res.json(results);
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ message: 'Server error fetching exam results' });
  }
});

// Get exam result by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await prisma.examResult.findUnique({
      where: { id },
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
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Exam result not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching exam result:', error);
    res.status(500).json({ message: 'Server error fetching exam result' });
  }
});

// Get exam results for a specific exam
router.get('/exam/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const results = await prisma.examResult.findMany({
      where: { examId },
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
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching exam results by exam:', error);
    res.status(500).json({ message: 'Server error fetching exam results by exam' });
  }
});

// Get exam results for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const results = await prisma.examResult.findMany({
      where: { userId },
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
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching exam results by user:', error);
    res.status(500).json({ message: 'Server error fetching exam results by user' });
  }
});

// Get exam result for a specific user and exam
router.get('/exam/:examId/user/:userId', async (req, res) => {
  try {
    const { examId, userId } = req.params;
    
    const result = await prisma.examResult.findFirst({
      where: {
        examId,
        userId
      },
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
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Exam result not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching exam result by exam and user:', error);
    res.status(500).json({ message: 'Server error fetching exam result by exam and user' });
  }
});

// Create new exam result
router.post('/', async (req, res) => {
  try {
    const { userId, examId, score, answers, status, startedAt, completedAt } = req.body;
    
    const result = await prisma.examResult.create({
      data: {
        userId,
        examId,
        score,
        answers,
        status,
        startedAt: startedAt || null,
        completedAt
      },
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
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating exam result:', error);
    res.status(500).json({ message: 'Server error creating exam result' });
  }
});

// Update exam result
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, answers, status, startedAt, completedAt } = req.body;
    
    // Check if exam result exists
    const existingResult = await prisma.examResult.findUnique({
      where: { id }
    });
    
    if (!existingResult) {
      return res.status(404).json({ message: 'Exam result not found' });
    }
    
    // Update exam result
    const result = await prisma.examResult.update({
      where: { id },
      data: {
        score,
        answers,
        status,
        startedAt: startedAt || null,
        completedAt
      },
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
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating exam result:', error);
    res.status(500).json({ message: 'Server error updating exam result' });
  }
});

// Delete exam result
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if exam result exists
    const existingResult = await prisma.examResult.findUnique({
      where: { id }
    });
    
    if (!existingResult) {
      return res.status(404).json({ message: 'Exam result not found' });
    }
    
    // Delete exam result
    await prisma.examResult.delete({
      where: { id }
    });
    
    res.json({ message: 'Exam result deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam result:', error);
    res.status(500).json({ message: 'Server error deleting exam result' });
  }
});

export const resultRoutes = router;
