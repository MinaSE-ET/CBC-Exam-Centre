
import express from 'express';
import prisma from '../prisma';

const router = express.Router();

// Get all questions
router.get('/', async (req, res) => {
  try {
    const questions = await prisma.question.findMany();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Server error fetching questions' });
  }
});

// Get question by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await prisma.question.findUnique({
      where: { id }
    });
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ message: 'Server error fetching question' });
  }
});

// Create new question
router.post('/', async (req, res) => {
  try {
    const { text, choices, type, difficulty, score, category } = req.body;
    
    const question = await prisma.question.create({
      data: {
        text,
        choices,
        type,
        difficulty,
        score,
        category
      }
    });
    
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Server error creating question' });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, choices, type, difficulty, score, category } = req.body;
    
    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id }
    });
    
    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Update question
    const question = await prisma.question.update({
      where: { id },
      data: {
        text,
        choices,
        type,
        difficulty,
        score,
        category
      }
    });
    
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Server error updating question' });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id }
    });
    
    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Delete question
    await prisma.question.delete({
      where: { id }
    });
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Server error deleting question' });
  }
});

export const questionRoutes = router;
