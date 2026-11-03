import crypto from 'crypto';

export interface WatermarkPayload {
  studentId: string;
  studentName: string;
  studentRollNo?: string;
  ipAddress: string;
  sessionId: string;
  timestamp: number;
  signature: string;
}

export class ForensicWatermarkService {
  private static readonly HMAC_SECRET = process.env.WATERMARK_SECRET || 'eduaegis_forensic_salt_2026';

  /**
   * Generates a tamper-proof forensic watermark payload for an authorized student viewer.
   */
  public static generatePayload(params: {
    studentId: string;
    studentName: string;
    studentRollNo?: string;
    ipAddress: string;
    sessionId: string;
  }): WatermarkPayload {
    const timestamp = Date.now();
    const dataString = `${params.studentId}|${params.studentName}|${params.studentRollNo || ''}|${params.ipAddress}|${params.sessionId}|${timestamp}`;
    
    const signature = crypto
      .createHmac('sha256', this.HMAC_SECRET)
      .update(dataString)
      .digest('hex')
      .substring(0, 16);

    return {
      ...params,
      timestamp,
      signature,
    };
  }

  /**
   * Verifies the authenticity of a leaked watermark stamp.
   */
  public static verifyPayload(payload: WatermarkPayload): boolean {
    const dataString = `${payload.studentId}|${payload.studentName}|${payload.studentRollNo || ''}|${payload.ipAddress}|${payload.sessionId}|${payload.timestamp}`;
    const expectedSig = crypto
      .createHmac('sha256', this.HMAC_SECRET)
      .update(dataString)
      .digest('hex')
      .substring(0, 16);

    return crypto.timingSafeEqual(Buffer.from(payload.signature), Buffer.from(expectedSig));
  }

  /**
   * Formats the visible text overlay string that bounces semi-transparently across the screen.
   */
  public static getVisibleWatermarkText(payload: WatermarkPayload): string {
    const maskedIp = payload.ipAddress.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.***.***.$4');
    const dateStr = new Date(payload.timestamp).toISOString().replace('T', ' ').substring(0, 19);
    return `${payload.studentName} [${payload.studentRollNo || payload.studentId.substring(0, 8)}] • ${maskedIp} • ${dateStr} • ${payload.signature}`;
  }

  /**
   * Provides client JavaScript animation instructions for smooth, un-blockable floating overlays.
   */
  public static getClientRenderConfig() {
    return {
      opacity: 0.18, // Visible enough to trace with phone cameras, subtle enough not to block study
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#FFFFFF',
      shadowColor: '#000000',
      bounceSpeedX: 0.8, // Pixels per frame
      bounceSpeedY: 0.6,
      gridSpacing: 280, // Alternating repeating grid nodes
      steganographicLumaShift: true // Imperceptible subtle pixel variance
    };
  }
}
