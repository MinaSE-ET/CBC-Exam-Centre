
import express from 'express';
import * as bcrypt from 'bcrypt';
import prisma from '../prisma';

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    
    res.json({
      id: userData.id,
      email: userData.email,
      username: userData.username || userData.email.split('@')[0],
      name: userData.name || '',
      role: userData.role
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

export const authRoutes = router;
