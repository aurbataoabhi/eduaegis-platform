import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding real database records...');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'apex-academy' },
    update: {},
    create: {
      name: 'Apex Tech Academy',
      slug: 'apex-academy',
      planTier: 'PRO_ACADEMY',
      storageQuotaGb: 500
    }
  });

  // 2. Create Teacher
  const passwordHash = bcrypt.hashSync('Password@2026', 8);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@apexacademy.edu' },
    update: {},
    create: {
      orgId: org.id,
      email: 'teacher@apexacademy.edu',
      fullName: 'Dr. Marcus Vance',
      role: 'TEACHER',
      passwordHash
    }
  });

  // 3. Create Students
  const student1 = await prisma.user.upsert({
    where: { email: 'alex@student.edu' },
    update: {},
    create: {
      orgId: org.id,
      email: 'alex@student.edu',
      fullName: 'Alex Chen',
      role: 'STUDENT',
      studentRollNo: 'CS-2026-042',
      passwordHash
    }
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'priya@student.edu' },
    update: {},
    create: {
      orgId: org.id,
      email: 'priya@student.edu',
      fullName: 'Priya Sharma',
      role: 'STUDENT',
      studentRollNo: 'CS-2026-043',
      passwordHash
    }
  });

  // 4. Create Course with Modules and Lectures
  const course = await prisma.course.create({
    data: {
      orgId: org.id,
      teacherId: teacher.id,
      title: 'Full-Stack Distributed Systems & Consensus',
      description: 'Master fault-tolerant distributed architectures, Paxos, Raft, and real-time streaming.',
      price: 299.0,
      isPublished: true,
      modules: {
        create: [
          {
            title: 'Module 1: Foundations of Fault-Tolerant Architectures',
            orderIndex: 1,
            lectures: {
              create: [
                {
                  title: '1.1 Network Partitions & The CAP Theorem',
                  orderIndex: 1,
                  isLiveClass: false
                },
                {
                  title: '1.2 Live Lecture: Raft Consensus & Resilient State Synchronization',
                  orderIndex: 2,
                  isLiveClass: true
                }
              ]
            }
          }
        ]
      }
    }
  });

  // 5. Enroll Students in Course
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student1.id,
        courseId: course.id
      }
    },
    update: {},
    create: {
      userId: student1.id,
      courseId: course.id
    }
  });

  console.log('Database successfully populated with real records!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
