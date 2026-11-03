import crypto from 'crypto';

export type PlanTier = 'STARTER_TUTOR' | 'PRO_ACADEMY' | 'ENTERPRISE_INSTITUTION';

export interface PlanFeatures {
  tier: PlanTier;
  maxActiveStudents: number;
  maxConcurrentLiveRooms: number;
  storageQuotaGb: number;
  antiCaptureDrmLevel: 'STANDARD' | 'HARDWARE_ENFORCED' | 'ENTERPRISE_CUSTOM';
  allowCodingContests: boolean;
  allowAiDoubtSolver: boolean;
  platformFeePercent: number; // Commission on course sales (e.g. 8% for Starter, 3% for Enterprise)
  whitelabelCustomDomain: boolean;
}

export class SaaSMonetizationService {
  private static readonly PLAN_CONFIGS: Record<PlanTier, PlanFeatures> = {
    STARTER_TUTOR: {
      tier: 'STARTER_TUTOR',
      maxActiveStudents: 50,
      maxConcurrentLiveRooms: 1,
      storageQuotaGb: 50,
      antiCaptureDrmLevel: 'STANDARD',
      allowCodingContests: false,
      allowAiDoubtSolver: true,
      platformFeePercent: 8.0,
      whitelabelCustomDomain: false
    },
    PRO_ACADEMY: {
      tier: 'PRO_ACADEMY',
      maxActiveStudents: 500,
      maxConcurrentLiveRooms: 5,
      storageQuotaGb: 500,
      antiCaptureDrmLevel: 'HARDWARE_ENFORCED',
      allowCodingContests: true,
      allowAiDoubtSolver: true,
      platformFeePercent: 5.0,
      whitelabelCustomDomain: true
    },
    ENTERPRISE_INSTITUTION: {
      tier: 'ENTERPRISE_INSTITUTION',
      maxActiveStudents: 10000,
      maxConcurrentLiveRooms: 50,
      storageQuotaGb: 5000,
      antiCaptureDrmLevel: 'ENTERPRISE_CUSTOM',
      allowCodingContests: true,
      allowAiDoubtSolver: true,
      platformFeePercent: 2.5,
      whitelabelCustomDomain: true
    }
  };

  /**
   * Retrieves features and limits for an organization's subscription tier.
   */
  public static getPlanFeatures(tier: PlanTier): PlanFeatures {
    return this.PLAN_CONFIGS[tier] || this.PLAN_CONFIGS.STARTER_TUTOR;
  }

  /**
   * Calculates revenue split on student course sales.
   * Ensures platform generates sustainable recurring income while teacher receives direct payouts.
   */
  public static calculateTuitionFeeSplit(coursePrice: number, tier: PlanTier) {
    const plan = this.getPlanFeatures(tier);
    const platformCommission = (coursePrice * plan.platformFeePercent) / 100;
    const teacherPayout = coursePrice - platformCommission;

    return {
      coursePrice,
      platformFeePercent: plan.platformFeePercent,
      platformCommission: Number(platformCommission.toFixed(2)),
      teacherPayout: Number(teacherPayout.toFixed(2))
    };
  }

  /**
   * Generates a signed Single Sign-On (SSO) Embed Token for partner institutions
   * who want to embed the secure classroom into their existing portals or mobile apps
   * without forcing students to re-login.
   */
  public static generateExternalEmbedToken(params: {
    orgId: string;
    studentId: string;
    studentName: string;
    lectureId: string;
    externalSecretKey: string;
    ttlMinutes?: number;
  }): { embedUrl: string; token: string; expiresAt: number } {
    const ttl = (params.ttlMinutes || 60) * 60;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;

    const rawPayload = `${params.orgId}|${params.studentId}|${params.studentName}|${params.lectureId}|${expiresAt}`;
    const token = crypto
      .createHmac('sha256', params.externalSecretKey)
      .update(rawPayload)
      .digest('hex');

    const embedUrl = `https://live.eduaegis.com/embed/${params.lectureId}?token=${token}&org=${params.orgId}&uid=${params.studentId}&exp=${expiresAt}`;

    return {
      embedUrl,
      token,
      expiresAt
    };
  }
}
