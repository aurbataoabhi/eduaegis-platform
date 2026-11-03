import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'INSTITUTE_ADMIN' | 'TEACHER' | 'STUDENT';
  orgId: string;
  orgName: string;
  studentRollNo?: string;
}

export class AuthController {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'eduaegis_super_jwt_secret_2026';

  // In-memory demo store synced with database seed
  public static users: Array<AuthUser & { passwordHash: string }> = [
    {
      id: 'usr_founder_01',
      email: 'founder@eduaegis.com',
      fullName: 'Abhishek (Platform Founder)',
      role: 'SUPER_ADMIN',
      orgId: 'org_eduaegis_hq',
      orgName: 'EduAegis Global HQ',
      passwordHash: bcrypt.hashSync('Founder@2026', 8)
    },
    {
      id: 'usr_teacher_01',
      email: 'marcus@apexacademy.edu',
      fullName: 'Dr. Marcus Vance (Instructor)',
      role: 'TEACHER',
      orgId: 'org_apex_01',
      orgName: 'Apex Tech Academy',
      passwordHash: bcrypt.hashSync('Teacher@2026', 8)
    },
    {
      id: 'usr_student_01',
      email: 'alex@student.edu',
      fullName: 'Alex Chen',
      role: 'STUDENT',
      studentRollNo: 'CS-2026-042',
      orgId: 'org_apex_01',
      orgName: 'Apex Tech Academy',
      passwordHash: bcrypt.hashSync('Student@2026', 8)
    }
  ];

  /**
   * Authenticates user and issues persistent session token.
   */
  public static async login(email: string, password: string):Promise<{
    success: boolean;
    token?: string;
    user?: AuthUser;
    message?: string;
  }> {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, message: 'No account found with this email.' };
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return { success: false, message: 'Invalid password. Please check your credentials.' };
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId
      },
      this.JWT_SECRET,
      { expiresIn: '30d' } // Persistent 30-day login (Zero-Zoom codes friction)
    );

    const { passwordHash, ...safeUser } = user;
    return {
      success: true,
      token,
      user: safeUser
    };
  }

  /**
   * Registers a new teacher or student account.
   */
  public static async register(data: {
    email: string;
    password: string;
    fullName: string;
    role: 'TEACHER' | 'STUDENT';
    orgName?: string;
  }): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
    const existing = this.users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser: AuthUser & { passwordHash: string } = {
      id: `usr_${Date.now()}`,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      orgId: 'org_apex_01',
      orgName: data.orgName || 'Apex Tech Academy',
      studentRollNo: data.role === 'STUDENT' ? `ST-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      passwordHash: bcrypt.hashSync(data.password, 8)
    };

    this.users.push(newUser);
    const { passwordHash, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  }
}
