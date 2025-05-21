/**
 * Type definitions for the performance testing suite
 * This module contains interfaces and types used throughout the testing framework
 */

/**
 * Represents a competitor's website and service information
 * Used for competitive analysis and benchmarking against other fiber providers
 */
export interface CompetitorSite {
  /** Name of the competitor company */
  name: string;
  /** URL of the competitor's website */
  url: string;
  /** List of regions where the competitor operates */
  region: string[];
  /** Type of service provided (e.g., Fiber, Cable, etc.) */
  serviceType: string;
  /** Target market segment */
  marketFocus: string;
  /** Detailed service offerings */
  services: {
    /** Fiber internet service availability */
    fiberInternet: boolean;
    /** Fiber TV service availability */
    fiberTV: boolean;
    /** Fiber phone service availability */
    fiberPhone: boolean;
    /** Mobile phone service availability */
    mobilePhone: boolean;
    /** Smart town/infrastructure services */
    smartTown: boolean;
    /** WiFi experience management services */
    wifiExperience: boolean;
    /** Outdoor WiFi coverage services */
    outdoorWifi: boolean;
    /** Fiber-based streaming services */
    fiberStreaming: boolean;
    /** Bark parental control service */
    bark: boolean;
  };
} 