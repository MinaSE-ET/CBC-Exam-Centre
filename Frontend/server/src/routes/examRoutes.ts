
import express from 'express';
import prisma from '../prisma';

const router = express.Router();

// Get all exams
router.get('/', async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        questions: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true
          }
        }
      }
    });
    res.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ message: 'Server error fetching exams' });
  }
});

// Get exam by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true
          }
        }
      }
    });
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ message: 'Server error fetching exam' });
  }
});

// Get exams assigned to a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const exams = await prisma.exam.findMany({
      where: {
        assignedTo: {
          some: {
            id: userId
          }
        }
      },
      include: {
        questions: true
      }
    });
    
    res.json(exams);
  } catch (error) {
    console.error('Error fetching user exams:', error);
    res.status(500).json({ message: 'Server error fetching user exams' });
  }
});

// Create new exam
router.post('/', async (req, res) => {
  try {
    const { title, description, duration, totalScore, passingScore, questionIds, assignedUserIds, status } = req.body;
    
    // Create exam with questions and assigned users
    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        duration,
        totalScore,
        passingScore,
        status,
        questions: {
          connect: questionIds.map((id: string) => ({ id }))
        },
        assignedTo: {
          connect: assignedUserIds.map((id: string) => ({ id }))
        }
      },
      include: {
        questions: true,
        assignedTo: true
      }
    });
    
    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ message: 'Server error creating exam' });
  }
});

// Update exam
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, totalScore, passingScore, questionIds, assignedUserIds, status } = req.body;
    
    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id }
    });
    
    if (!existingExam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Update exam with relations
    const exam = await prisma.exam.update({
      where: { id },
      data: {
        title,
        description,
        duration,
        totalScore,
        passingScore,
        status,
        questions: {
          set: questionIds.map((id: string) => ({ id }))
        },
        assignedTo: {
          set: assignedUserIds.map((id: string) => ({ id }))
        }
      },
      include: {
        questions: true,
        assignedTo: true
      }
    });
    
    res.json(exam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ message: 'Server error updating exam' });
  }
});

// Delete exam
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id }
    });
    
    if (!existingExam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Delete exam
    await prisma.exam.delete({
      where: { id }
    });
    
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ message: 'Server error deleting exam' });
  }
});

export const examRoutes = router;
