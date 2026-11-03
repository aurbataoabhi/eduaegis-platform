/**
 * AntiCaptureGuard provides security primitives to block screen recording,
 * prevent unauthorized downloads, intercept screengrabs, and enforce DRM boundaries.
 */

export interface NativeDisplayProtectionConfig {
  enableWindowsDisplayAffinity: boolean; // SetWindowDisplayAffinity(WDA_MONITOR)
  enableMacContentProtection: boolean;  // setContentProtection(true)
  enableAndroidFlagSecure: boolean;      // FLAG_SECURE
  enableIosScreenCaptureObserver: boolean;
}

export class AntiCaptureGuard {
  /**
   * Generates client-side security harness script injected into the video player view.
   * Traps DevTools, stops PrintScreen, blanks video upon tab blur, and blocks context menu.
   */
  public static getWebProtectionScript(): string {
    return `
      (function() {
        // 1. Disable Context Menu
        document.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          return false;
        }, { capture: true });

        // 2. Intercept Screen Capture / DevTools Key Combinations
        window.addEventListener('keydown', function(e) {
          // PrintScreen, F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
          if (
            e.key === 'PrintScreen' ||
            e.keyCode === 44 ||
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p')) ||
            (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'j'))
          ) {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
              // Overwrite clipboard instantly
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('Screenshots are prohibited on EduAegis.');
              }
              triggerScreenBlankout('SCREENSHOT_ATTEMPT');
            }
            return false;
          }
        }, { capture: true });

        // 3. Tab Visibility & Window Blur Blankout
        function triggerScreenBlankout(reason) {
          const videoElement = document.querySelector('video.eduaegis-secure-stream');
          const blackoutOverlay = document.getElementById('eduaegis-blackout-shield');
          if (videoElement) {
            videoElement.style.filter = 'blur(40px) brightness(0)';
          }
          if (blackoutOverlay) {
            blackoutOverlay.style.display = 'flex';
          }
        }

        function restoreScreen() {
          const videoElement = document.querySelector('video.eduaegis-secure-stream');
          const blackoutOverlay = document.getElementById('eduaegis-blackout-shield');
          if (videoElement) {
            videoElement.style.filter = 'none';
          }
          if (blackoutOverlay) {
            blackoutOverlay.style.display = 'none';
          }
        }

        window.addEventListener('blur', function() {
          triggerScreenBlankout('WINDOW_BLUR');
        });

        window.addEventListener('focus', function() {
          restoreScreen();
        });

        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            triggerScreenBlankout('TAB_HIDDEN');
          } else {
            restoreScreen();
          }
        });

        // 4. Anti-Debugging DevTools Trap
        let devtoolsOpen = false;
        setInterval(function() {
          const start = performance.now();
          debugger; // Halts if devtools is open
          if (performance.now() - start > 100) {
            if (!devtoolsOpen) {
              devtoolsOpen = true;
              triggerScreenBlankout('DEVTOOLS_DETECTED');
              console.clear();
            }
          } else {
            devtoolsOpen = false;
          }
        }, 1000);
      })();
    `;
  }

  /**
   * Native client specifications for Windows (Electron/Tauri) and Mobile (Flutter/RN).
   */
  public static getNativeProtectionConfig(): NativeDisplayProtectionConfig {
    return {
      enableWindowsDisplayAffinity: true,
      enableMacContentProtection: true,
      enableAndroidFlagSecure: true,
      enableIosScreenCaptureObserver: true
    };
  }

  /**
   * Validates whether a download request is permitted.
   * Rules:
   * 1. Strictly forbidden on Web Browsers.
   * 2. Only permitted on verified Native Windows/Mac/Android/iOS EduAegis App containers.
   * 3. Downloaded files are encrypted HLS chunks, never raw unencrypted MP4.
   */
  public static isDownloadPermitted(params: {
    clientPlatform: string; // "WEB" | "WINDOWS_APP" | "MACOS_APP" | "ANDROID_APP" | "IOS_APP"
    isCourseDownloadAllowed: boolean;
    appIntegrityAttested: boolean;
  }): { allowed: boolean; reason?: string } {
    if (params.clientPlatform === 'WEB') {
      return {
        allowed: false,
        reason: 'Direct downloads are strictly prohibited in web browsers to protect intellectual property. Please use the official EduAegis Desktop or Mobile App for offline encrypted study.'
      };
    }

    if (!params.isCourseDownloadAllowed) {
      return {
        allowed: false,
        reason: 'The instructor or institution has disabled offline downloads for this lecture.'
      };
    }

    if (!params.appIntegrityAttested) {
      return {
        allowed: false,
        reason: 'App integrity attestation failed. Possible tampered client.'
      };
    }

    return { allowed: true };
  }
}
