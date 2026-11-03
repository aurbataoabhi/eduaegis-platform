import crypto from 'crypto';

export class DrmTokenService {
  private static readonly SECRET_KEY = process.env.DRM_SIGNING_KEY || 'eduaegis_drm_encryption_2026';

  /**
   * Generates a short-lived playback token for encrypted HLS/DASH media playlists.
   * Signed with student ID, lecture ID, and client IP.
   */
  public static generateSignedPlaybackUrl(params: {
    lectureId: string;
    studentId: string;
    clientIp: string;
    ttlSeconds?: number;
  }): { streamUrl: string; expiresAt: number; token: string } {
    const ttl = params.ttlSeconds || 120; // 2 minutes validity for manifest handshake
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;

    const dataToSign = `${params.lectureId}:${params.studentId}:${params.clientIp}:${expiresAt}`;
    const token = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');

    const streamUrl = `/api/v1/stream/${params.lectureId}/master.m3u8?token=${token}&expires=${expiresAt}&sid=${params.studentId}`;

    return {
      streamUrl,
      expiresAt,
      token
    };
  }

  /**
   * Validates the signed key request from Shaka Player / Video.js.
   */
  public static verifyKeyRequest(params: {
    lectureId: string;
    studentId: string;
    clientIp: string;
    expiresAt: number;
    token: string;
  }): boolean {
    if (Math.floor(Date.now() / 1000) > params.expiresAt) {
      return false; // Expired
    }

    const dataToSign = `${params.lectureId}:${params.studentId}:${params.clientIp}:${params.expiresAt}`;
    const expected = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(params.token), Buffer.from(expected));
  }
}
