
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create admin user if not exists
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  });
  
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        name: 'Administrator',
        role: 'admin',
        password: passwordHash
      }
    });
    console.log('Admin user created');
  }
  
  // Create student user if not exists
  const studentExists = await prisma.user.findUnique({
    where: { email: 'student1@example.com' }
  });
  
  if (!studentExists) {
    const passwordHash = await bcrypt.hash('student123', 10);
    await prisma.user.create({
      data: {
        email: 'student1@example.com',
        username: 'student1',
        name: 'Student User',
        role: 'student',
        password: passwordHash
      }
    });
    console.log('Student user created');
  }
  
  console.log('Database seeding completed');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
