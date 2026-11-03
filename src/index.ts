import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { ForensicWatermarkService } from './security/watermark-service';
import { AntiCaptureGuard } from './security/anti-capture-guard';
import { DeviceFingerprintService } from './security/device-fingerprint';
import { DrmTokenService } from './security/drm-token-service';
import { ClassroomRealtimeManager } from './realtime/classroom-socket';
import { ContextualAiDoubtEngine } from './ai/doubt-solver';
import { SandboxedCodeRunner } from './assessments/code-runner';
import { SaaSMonetizationService } from './saas/subscription-service';
import { BusinessGrowthEngine } from './business/growth-engine';
import { AuthController } from './auth/auth-controller';
import { PaymentGatewayService } from './payments/payment-service';
import { NotificationService } from './notifications/notification-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Realtime Classroom Engine
new ClassroomRealtimeManager(io);

// 1. Health & Platform Manifest
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'EduAegis Enterprise Core',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Generate Forensic Watermark Payload for Student Viewport
app.post('/api/v1/security/watermark-payload', (req, res) => {
  const { studentId, studentName, studentRollNo, sessionId } = req.body;
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '192.168.1.104';

  const payload = ForensicWatermarkService.generatePayload({
    studentId: studentId || 'std_849204',
    studentName: studentName || 'Alex Chen',
    studentRollNo: studentRollNo || 'CS-2026-042',
    ipAddress,
    sessionId: sessionId || 'sess_live_alpha'
  });

  const visibleText = ForensicWatermarkService.getVisibleWatermarkText(payload);
  const clientConfig = ForensicWatermarkService.getClientRenderConfig();

  res.json({
    payload,
    visibleText,
    clientConfig,
    webProtectionScript: AntiCaptureGuard.getWebProtectionScript()
  });
});

// 3. DRM Signed Stream Key & Playback Manifest Request
app.post('/api/v1/stream/request-access', (req, res) => {
  const { lectureId, studentId } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '192.168.1.104';

  const playback = DrmTokenService.generateSignedPlaybackUrl({
    lectureId: lectureId || 'lec_datastructures_01',
    studentId: studentId || 'std_849204',
    clientIp,
    ttlSeconds: 300 // 5-minute token rotation
  });

  res.json({
    success: true,
    playback,
    antiDownloadEnforcement: {
      isWebDownloadDisabled: true,
      allowedInDesktopClient: true,
      allowedInMobileClient: true,
      encryptionFormat: 'AES-128-CBC-HLS-CHUNKED'
    }
  });
});

// 4. Download Feasibility Check (Strictly blocked in Web)
app.post('/api/v1/stream/check-download', (req, res) => {
  const { clientPlatform, isCourseDownloadAllowed, appIntegrityAttested } = req.body;

  const result = AntiCaptureGuard.isDownloadPermitted({
    clientPlatform: clientPlatform || 'WEB',
    isCourseDownloadAllowed: isCourseDownloadAllowed ?? true,
    appIntegrityAttested: appIntegrityAttested ?? false
  });

  res.json(result);
});

// 5. Contextual AI Doubt Engine with Anti-Cheat Assessment Lockout
app.post('/api/v1/ai/ask-doubt', async (req, res) => {
  const { studentId, courseId, lectureId, questionText, studentContext } = req.body;

  const result = await ContextualAiDoubtEngine.answerStudentDoubt({
    studentId: studentId || 'std_849204',
    courseId: courseId || 'course_cs101',
    lectureId,
    questionText,
    studentContext
  });

  res.json(result);
});

// 6. Sandboxed Code Execution for Hackathons & Coding Contests
app.post('/api/v1/contest/execute-code', async (req, res) => {
  const { contestId, challengeId, studentId, language, sourceCode, testCases } = req.body;

  const evaluation = await SandboxedCodeRunner.evaluateSubmission({
    contestId: contestId || 'hackathon_2026_spring',
    challengeId: challengeId || 'prob_two_sum',
    studentId: studentId || 'std_849204',
    language: language || 'python',
    sourceCode: sourceCode || 'print("Hello EduAegis")',
    testCases: testCases || [
      { input: '2 3', expectedOutput: '5', isHidden: false },
      { input: '10 -5', expectedOutput: '5', isHidden: true }
    ]
  });

  res.json(evaluation);
});

// 7. SaaS Tier & Revenue Split Calculation
app.get('/api/v1/saas/tier-info/:tier', (req, res) => {
  const tier = (req.params.tier as any) || 'PRO_ACADEMY';
  const features = SaaSMonetizationService.getPlanFeatures(tier);
  const sampleSplit = SaaSMonetizationService.calculateTuitionFeeSplit(299, tier);

  res.json({
    features,
    sampleTuitionSplitFor299Course: sampleSplit
  });
});

// 8. Business Growth & Founder Analytics Hub
app.get('/api/v1/business/founder-metrics', (req, res) => {
  const metrics = BusinessGrowthEngine.getFounderMetrics();
  res.json(metrics);
});

// 9. Instant Piracy Loss ROI Calculator for Prospective Academy Leads
app.post('/api/v1/business/calculate-roi', (req, res) => {
  const { studentCount, averageCourseFee, subscriptionTier } = req.body;
  const result = BusinessGrowthEngine.calculateInstituteRoi({
    studentCount: Number(studentCount) || 200,
    averageCourseFee: Number(averageCourseFee) || 350,
    subscriptionTier: subscriptionTier || 'PRO_ACADEMY'
  });
  res.json(result);
});

// 10. 1-Click Institute Migration Engine (Switch from Zoom in 60s)
app.post('/api/v1/business/migrate-students', (req, res) => {
  const { rawCsvText, academyName } = req.body;
  const sampleCsv = rawCsvText || "John Doe, john@example.com, +1-555-1234, Batch 2026\nJane Smith, jane@example.com, +1-555-5678, Batch 2026";
  const importedStudents = BusinessGrowthEngine.parseMigrationList(sampleCsv);
  res.json({
    success: true,
    academyName: academyName || 'Apex Academy',
    totalImported: importedStudents.length,
    students: importedStudents,
    message: 'Accounts provisioned with single-click magic login tokens!'
  });
});

// 11. Viral Affiliate Partner Referral Generator
app.post('/api/v1/business/create-affiliate', (req, res) => {
  const { teacherId, customHandle } = req.body;
  const affiliate = BusinessGrowthEngine.generateAffiliateLink(teacherId || 'tch_9921', customHandle);
  res.json(affiliate);
});

// 12. Full Multi-Role Authentication (Teacher, Student, SuperAdmin)
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthController.login(email || 'alex@student.edu', password || 'Student@2026');
  res.json(result);
});

app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, fullName, role, orgName } = req.body;
  const result = await AuthController.register({
    email,
    password,
    fullName,
    role: role || 'STUDENT',
    orgName
  });
  res.json(result);
});

// 13. Instant Payment Gateway Order Creation & Automated 5% Fee Split
app.post('/api/v1/payments/create-order', (req, res) => {
  const { courseId, courseTitle, coursePrice, studentId, studentEmail } = req.body;
  const order = PaymentGatewayService.createOrder({
    courseId: courseId || 'crs_dist_sys_01',
    courseTitle: courseTitle || 'Full-Stack Distributed Systems Engineering',
    coursePrice: Number(coursePrice) || 299,
    studentId: studentId || 'usr_student_01',
    studentEmail: studentEmail || 'alex@student.edu'
  });
  res.json(order);
});

app.post('/api/v1/payments/verify', (req, res) => {
  const { orderId, transactionRef } = req.body;
  const verification = PaymentGatewayService.verifyPayment(orderId || 'ord_demo_101', transactionRef);
  res.json(verification);
});

// 14. Class Reminder Dispatcher (WhatsApp & Email)
app.post('/api/v1/notifications/send-reminder', async (req, res) => {
  const { lectureId, lectureTitle, teacherName, studentRecipients } = req.body;
  const result = await NotificationService.broadcastClassReminder({
    lectureId: lectureId || 'lec_01',
    lectureTitle: lectureTitle || 'Distributed Systems: Raft Consensus',
    teacherName: teacherName || 'Dr. Marcus Vance',
    studentRecipients: studentRecipients || [
      { name: 'Alex Chen', email: 'alex@student.edu', phone: '+1-555-0199' }
    ]
  });
  res.json(result);
});

// 15. Real Database Endpoints (Prisma + SQLite/Postgres)
app.get('/api/v1/db/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        teacher: { select: { fullName: true, email: true } },
        modules: {
          include: { lectures: true }
        },
        enrollments: true
      }
    });
    res.json({ success: true, count: courses.length, courses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/db/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentRollNo: true,
        createdAt: true
      }
    });
    res.json({ success: true, count: users.length, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/db/enroll-student', async (req, res) => {
  try {
    const { email, courseId } = req.body;
    let user = await prisma.user.findUnique({ where: { email: email || 'alex@student.edu' } });
    if (!user) {
      user = await prisma.user.findFirst();
    }
    const course = courseId ? await prisma.course.findUnique({ where: { id: courseId } }) : await prisma.course.findFirst();

    if (!user || !course) {
      return res.status(404).json({ success: false, message: 'User or course not found in database.' });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        courseId: course.id
      }
    });

    res.json({
      success: true,
      message: 'Student permanently enrolled into database!',
      enrollment,
      user: { name: user.fullName, email: user.email },
      course: { title: course.title, price: course.price }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 4200;
server.listen(PORT, () => {
  console.log(`EduAegis Core Platform online at http://localhost:${PORT}`);
});
