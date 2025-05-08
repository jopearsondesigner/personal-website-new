// File: src/lib/utils/device-performance.ts

import { browser } from '$app/environment';
import { writable, derived, get as getStore } from 'svelte/store';

// Performance metrics for memory usage
export const memoryUsageStore = writable(0);
export const objectPoolStatsStore = writable({
  poolName: 'Main',
  poolType: 'Star',
  totalCapacity: 0,
  activeObjects: 0,
  objectsCreated: 0,
  objectsReused: 0,
  utilizationRate: 0,
  reuseRatio: 0,
  estimatedMemorySaved: 0
});

// Device capability interfaces
export interface DeviceCapabilities {
  // Existing properties
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLowPowerDevice: boolean;
  isLowPerformance?: boolean; // Added for compatibility with new components
  supportsWebGL: boolean;
  hasTouchScreen: boolean;
  prefersReducedMotion: boolean;
  browserInfo: {
    name: string;
    isSafari: boolean;
    isChrome: boolean;
    isFirefox: boolean;
    isWebView: boolean;
  };
  cpuCores: number;
  screenSize: {
    width: number;
    height: number;
    dpr: number;
  };
  lastUpdated: number;

  // New properties for the refactored components
  maxStars?: number;
  frameSkip?: number;
  updateInterval?: number;
  useWorker?: boolean;
  useParallax?: boolean;
  enableGlow?: boolean;
  effectsLevel?: 'high' | 'medium' | 'low';
  tier?: 'high' | 'medium' | 'low';
  hasGPUAcceleration?: boolean;
  performance?: {
    targetFPS: number;
    qualityLevel: number;
  };
}

// Create a writable store for device capabilities
const createDeviceCapabilitiesStore = () => {
  // Initialize with default values (keeping your existing defaults)
  const initialCapabilities: DeviceCapabilities = {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLowPowerDevice: false,
    isLowPerformance: false,
    supportsWebGL: true,
    hasTouchScreen: false,
    prefersReducedMotion: false,
    browserInfo: {
      name: 'unknown',
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isWebView: false
    },
    cpuCores: 4,
    screenSize: {
      width: 1920,
      height: 1080,
      dpr: 1
    },
    lastUpdated: Date.now(),

    // New defaults for the refactored components
    maxStars: 60,
    frameSkip: 0,
    updateInterval: 16,
    useWorker: true,
    useParallax: true,
    enableGlow: true,
    effectsLevel: 'high',
    tier: 'high',
    hasGPUAcceleration: true,
    performance: {
      targetFPS: 60,
      qualityLevel: 1.0
    }
  };

  const { subscribe, set, update } = writable<DeviceCapabilities>(initialCapabilities);

  function get() {
    return getStore({ subscribe });
  }

  // Detect capabilities when in browser
  function detectCapabilities() {
    if (!browser) return;

    try {
      // All your existing detection code here
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;

      const isMobile =
        width < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      const isTablet =
        (width >= 768 && width < 1024) || /iPad|Android(?!.*Mobile)/i.test(userAgent);

      const isDesktop =
        width >= 1024 &&
        !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      // Detect browser
      const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
      const isChrome = /chrome/i.test(userAgent) && !/edge/i.test(userAgent);
      const isFirefox = /firefox/i.test(userAgent);
      const isWebView =
        /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent) ||
        /Android.*Version\/[0-9].[0-9].*Chrome\/[0-9]*.0.0.0/i.test(userAgent);

      // CPU Cores
      const cpuCores = navigator.hardwareConcurrency || 2;

      // WebGL support
      let supportsWebGL = false;
      try {
        const canvas = document.createElement('canvas');
        supportsWebGL = !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch (e) {
        supportsWebGL = false;
      }

      // Touch support
      const hasTouchScreen =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;

      // Reduced motion preference
      const prefersReducedMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Detect low power device
      // Heuristics: Older mobile, low CPU cores, or iOS
      const isLowPowerDevice =
        (isMobile && cpuCores <= 4) ||
        (isSafari && isMobile) ||
        width * height * (window.devicePixelRatio || 1) > 2500000; // High res screens on mobile

      // New for compatibility with refactored components
      const isLowPerformance = isLowPowerDevice || prefersReducedMotion;

      // Calculate performance settings based on device capabilities
      const maxStars = isLowPerformance ? 20 : isMobile ? 40 : 60;
      const frameSkip = isLowPerformance ? 2 : isMobile ? 1 : 0;
      const useWorker = !isLowPerformance;
      const useParallax = !isLowPerformance && !isMobile;
      const enableGlow = !isLowPerformance;

      // Determine effects level
      let effectsLevel: 'high' | 'medium' | 'low' = 'high';
      let tier: 'high' | 'medium' | 'low' = 'high';

      if (isLowPerformance) {
        effectsLevel = 'low';
        tier = 'low';
      } else if (isMobile || isTablet) {
        effectsLevel = 'medium';
        tier = 'medium';
      }

      // Determine GPU acceleration
      const hasGPUAcceleration = supportsWebGL && !isLowPerformance;

      // Target FPS based on device
      const targetFPS = isLowPerformance ? 30 : 60;

      // Animation quality level (0.0 - 1.0)
      let qualityLevel = 1.0;
      if (prefersReducedMotion) {
        qualityLevel = 0.3;
      } else if (isLowPerformance) {
        qualityLevel = 0.5;
      } else if (isMobile) {
        qualityLevel = 0.7;
      }

      update((current) => ({
        ...current,
        isMobile,
        isTablet,
        isDesktop,
        isLowPowerDevice,
        isLowPerformance,
        supportsWebGL,
        hasTouchScreen,
        prefersReducedMotion,
        browserInfo: {
          name: isSafari ? 'safari' : isChrome ? 'chrome' : isFirefox ? 'firefox' : 'unknown',
          isSafari,
          isChrome,
          isFirefox,
          isWebView
        },
        cpuCores,
        screenSize: {
          width,
          height,
          dpr: window.devicePixelRatio || 1
        },
        // New properties for refactored components
        maxStars,
        frameSkip,
        updateInterval: isLowPerformance ? 32 : 16,
        useWorker,
        useParallax,
        enableGlow,
        effectsLevel,
        tier,
        hasGPUAcceleration,
        performance: {
          targetFPS,
          qualityLevel
        },
        lastUpdated: Date.now()
      }));

      // Update document for CSS access
      document.documentElement.setAttribute(
        'data-device-type',
        isLowPerformance ? 'low-performance' : isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
      );

      if (prefersReducedMotion) {
        document.documentElement.setAttribute('data-prefers-reduced-motion', 'true');
      }

      // Browser-specific attributes
      if (isSafari) {
        document.documentElement.setAttribute('data-browser', 'safari');
      } else if (isChrome) {
        document.documentElement.setAttribute('data-browser', 'chrome');
      } else if (isFirefox) {
        document.documentElement.setAttribute('data-browser', 'firefox');
      }

      // Add performance tier to document
      document.documentElement.setAttribute('data-performance-tier', tier);
    } catch (error) {
      console.error('Error detecting device capabilities:', error);
    }
  }

  // Your existing setup listeners function
  function setupListeners() {
    if (!browser) return () => {};

    // Update on resize and orientation change
    const handleChange = () => {
      setTimeout(detectCapabilities, 300); // Wait for resize/rotation to complete
    };

    window.addEventListener('resize', handleChange, { passive: true });
    window.addEventListener('orientationchange', handleChange, { passive: true });

    // Update on reduced motion preference change
    if (window.matchMedia) {
      window
        .matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', detectCapabilities);
    }

    // Initial detection
    detectCapabilities();

    // Return cleanup function
    return () => {
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);
      if (window.matchMedia) {
        window
          .matchMedia('(prefers-reduced-motion: reduce)')
          .removeEventListener('change', detectCapabilities);
      }
    };
  }

  // Setup on browser
  if (browser) {
    setupListeners();
  }

  // Return store object with methods
  return {
    subscribe,
    set,
    update,
    get,
    detectCapabilities,
    setupListeners,
    // Keep your existing helper methods
    getAnimationQuality: (isMobile?: boolean, isLowPower?: boolean) => {
      if (!browser) return 1.0;

      const capabilities = get();
      let detected = capabilities.isMobile;
      let isLowPowerDevice = capabilities.isLowPowerDevice;

      if (isMobile !== undefined) {
        detected = isMobile;
      }

      if (isLowPower !== undefined) {
        isLowPowerDevice = isLowPower;
      }

      if (capabilities.prefersReducedMotion) {
        return 0.3; // Minimal animations for accessibility
      } else if (isLowPowerDevice) {
        return 0.5; // Reduced animations for low power devices
      } else if (detected) {
        return 0.7; // Standard mobile optimization
      } else {
        return 1.0; // Full animations for desktop
      }
    }
  };
};

// Create a singleton instance
export const deviceCapabilities = createDeviceCapabilitiesStore();

// Derived stores for common checks (keeping your existing ones)
export const isMobile = derived(deviceCapabilities, ($capabilities) => $capabilities.isMobile);

export const isLowPerformance = derived(
  deviceCapabilities,
  ($capabilities) => $capabilities.isLowPerformance || false
);

export const prefersReducedMotion = derived(
  deviceCapabilities,
  ($capabilities) => $capabilities.prefersReducedMotion
);

export const animationQuality = derived(deviceCapabilities, ($capabilities) => {
  if ($capabilities.prefersReducedMotion) {
    return 0.3;
  } else if ($capabilities.isLowPerformance) {
    return 0.5;
  } else if ($capabilities.isMobile) {
    return 0.7;
  } else {
    return 1.0;
  }
});

// Performance monitoring setup
export function setupPerformanceMonitoring() {
  if (!browser) return () => {};

  let rafId: number | null = null;
  let lastTime = performance.now();
  let frames = 0;
  let fps = 60;

  const updateStats = () => {
    // Update FPS calculation
    const now = performance.now();
    frames++;

    if (now >= lastTime + 1000) {
      fps = Math.round((frames * 1000) / (now - lastTime));
      frames = 0;
      lastTime = now;

      // Update memory usage if available
      if (performance && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        if (memoryInfo.jsHeapSizeLimit > 0) {
          const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
          memoryUsageStore.set(usageRatio);
        }
      }
    }

    // Continue loop
    rafId = requestAnimationFrame(updateStats);
  };

  // Start monitoring
  rafId = requestAnimationFrame(updateStats);

  // Return cleanup function
  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

// Function to update object pool stats
export function updateObjectPoolStats(stats: Partial<typeof objectPoolStatsStore._)) {
  objectPoolStatsStore.update(current => ({
    ...current,
    ...stats
  }));
}