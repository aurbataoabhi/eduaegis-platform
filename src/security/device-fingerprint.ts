import crypto from 'crypto';

export interface DeviceContext {
  userId: string;
  deviceHash: string;
  deviceName: string;
  platform: 'WINDOWS' | 'MACOS' | 'ANDROID' | 'IOS' | 'WEB';
  ipAddress: string;
  userAgent: string;
}

export class DeviceFingerprintService {
  private static readonly MAX_REGISTERED_DEVICES = 2; // Maximum concurrent registered devices per student

  /**
   * Computes a resilient device fingerprint based on system headers, canvas/hardware signals.
   */
  public static computeFingerprint(rawSignals: {
    userAgent: string;
    screenResolution?: string;
    hardwareConcurrency?: number;
    platform: string;
    uniqueHardwareId?: string; // MAC / Motherboard UUID from native apps
  }): string {
    const rawString = `${rawSignals.platform}|${rawSignals.userAgent}|${rawSignals.screenResolution || ''}|${rawSignals.hardwareConcurrency || ''}|${rawSignals.uniqueHardwareId || ''}`;
    return crypto.createHash('sha256').update(rawString).digest('hex');
  }

  /**
   * Generates a pair of JWT access token and rotating refresh token bound to device.
   */
  public static generateDeviceBoundTokens(userId: string, deviceHash: string) {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // In production, sign using jsonwebtoken with RS256/HS256
    const accessTokenPayload = {
      sub: userId,
      dvh: deviceHash.substring(0, 16),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60 // 15 minutes short-lived
    };

    return {
      accessTokenPayload,
      refreshToken,
      refreshTokenHash
    };
  }

  /**
   * Validates if a user is within allowed device concurrency thresholds.
   */
  public static validateDeviceLimit(
    activeDevicesCount: number,
    isCurrentDeviceRegistered: boolean
  ): { allowed: boolean; message?: string } {
    if (isCurrentDeviceRegistered) {
      return { allowed: true };
    }

    if (activeDevicesCount >= this.MAX_REGISTERED_DEVICES) {
      return {
        allowed: false,
        message: `Device limit reached (${this.MAX_REGISTERED_DEVICES} devices). Please deregister an existing device from your profile before linking this device.`
      };
    }

    return { allowed: true };
  }
}
