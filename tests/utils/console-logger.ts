import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as lockfile from 'proper-lockfile';

// Generate a unique test run ID when the module loads
const TEST_RUN_ID = uuidv4();

// Track seen messages to avoid duplicates
const seenMessages = new Set<string>();
const seenErrors = new Map<string, number>();

// Store logs by browser/device
interface LogEntry {
  timestamp: string;
  type: string;
  message: string;
  location?: {
    url: string;
    lineNumber: number;
  };
  count?: number;
  testName?: string;
  testNames?: string[];  // Track all test names that encountered this error
  linkData?: {
    text: string;
    href: string;
  };
}

interface BrowserLogs {
  errors: LogEntry[];
  warnings: LogEntry[];
  unhandled: LogEntry[];
  testRuns: string[];  // Changed from Set to array
}

// Map to store logs for each browser type (not per worker)
const browserLogs = new Map<string, BrowserLogs>();

// Add type for lock release function
type LockRelease = () => Promise<void>;

// Helper to get browser identifier (just browser type, not per worker)
function getBrowserId(page: Page): string {
  const context = page.context();
  const browser = context.browser();
  if (!browser) {
    return 'unknown-browser';
  }
  
  // Get device name from viewport size
  let device = 'desktop';
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 768) {
    device = 'mobile';
  } else if (viewport && viewport.width < 1024) {
    device = 'tablet';
  }
  
  // Only use browser type and device, not worker-specific info
  return `${browser.browserType().name()}-${device}`;
}

// Helper to get a normalized message key for deduplication
function getMessageKey(msg: any): string {
  const text = msg.text();
  const type = msg.type();
  const location = msg.location();
  
  if (type === 'error' && location) {
    return `${type}:${text}:${location.url}:${location.lineNumber}`;
  }
  
  return `${type}:${text}`;
}

// Helper to create a log entry
function createLogEntry(msg: any, count?: number, testName?: string, linkData?: { text: string; href: string }): LogEntry {
  const type = msg.type().toUpperCase();
  const text = msg.text();
  const location = msg.location();
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type,
    message: text,
    testName,
    linkData
  };

  if (location) {
    entry.location = {
      url: location.url,
      lineNumber: location.lineNumber
    };
  }

  if (count && count > 1) {
    entry.count = count;
  }

  return entry;
}

// Helper to normalize a URL for deduplication
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only keep the hostname and pathname, ignore query params and fragments
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    // If URL parsing fails, return the original
    return url;
  }
}

// Helper to get a unique key for a log entry
function getLogEntryKey(entry: LogEntry): string {
  const { type, message, location } = entry;
  
  // Normalize the message by removing timestamps and other variable parts
  const normalizedMessage = message
    .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs with 'URL'
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, 'TIMESTAMP') // Replace timestamps
    .replace(/\d+ms/g, 'TIMEOUT') // Replace timeout values
    .replace(/\d+/g, 'NUMBER') // Replace other numbers
    .trim();
  
  // For location, only use the normalized URL and ignore line numbers
  // This helps deduplicate errors that occur in the same file/URL
  const locationStr = location ? normalizeUrl(location.url) : '';
  
  // For YouTube embeds and other third-party content, ignore line numbers
  // as they often change but represent the same error
  const isThirdParty = locationStr.includes('youtube.com') || 
                       locationStr.includes('google.com') ||
                       locationStr.includes('launchdarkly.com');
  
  return `${type}:${normalizedMessage}:${locationStr}${isThirdParty ? '' : `:${location?.lineNumber || 0}`}`;
}

// Helper to merge duplicate log entries
function mergeDuplicateLogs(logs: LogEntry[]): LogEntry[] {
  const mergedMap = new Map<string, LogEntry>();
  
  // First, sort logs by timestamp to ensure consistent merging
  const sortedLogs = [...logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  
  for (const entry of sortedLogs) {
    // Skip LOG type messages
    if (entry.type === 'LOG') {
      continue;
    }

    const key = getLogEntryKey(entry);
    const existing = mergedMap.get(key);
    
    if (existing) {
      // Update count and keep the earliest timestamp
      existing.count = (existing.count || 1) + 1;
      if (entry.timestamp < existing.timestamp) {
        existing.timestamp = entry.timestamp;
        // Update location to the earliest occurrence
        existing.location = entry.location;
      }
      
      // Merge test names
      if (entry.testName) {
        if (!existing.testNames) {
          existing.testNames = [];
        }
        if (!existing.testNames.includes(entry.testName)) {
          existing.testNames.push(entry.testName);
        }
      }
      if (entry.testNames) {
        if (!existing.testNames) {
          existing.testNames = [];
        }
        for (const testName of entry.testNames) {
          if (!existing.testNames.includes(testName)) {
            existing.testNames.push(testName);
          }
        }
      }
    } else {
      // First occurrence
      const newEntry = { 
        ...entry,
        count: 1,
        testNames: entry.testName ? [entry.testName] : (entry.testNames || [])
      };
      // Remove testName since we're using testNames array
      delete newEntry.testName;
      mergedMap.set(key, newEntry);
    }
  }
  
  return Array.from(mergedMap.values());
}

// Helper to ensure directory exists with proper permissions
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      // Create directory and all parent directories
      await fs.promises.mkdir(dirPath, { 
        recursive: true,
        mode: 0o755 // rwxr-xr-x permissions
      });
      console.log(`Created directory at ${dirPath}`);
    } else {
      // Ensure directory has correct permissions
      await fs.promises.chmod(dirPath, 0o755);
    }
  } catch (error) {
    console.error(`Failed to create/update directory at ${dirPath}:`, error);
    throw error; // Re-throw to handle in caller
  }
}

// Helper to write logs to file with locking
async function writeLogsToFile(): Promise<void> {
  const timestamp = new Date().toISOString();
  const logDir = path.join(process.cwd(), 'browser-console-logs');
  
  try {
    // Ensure logs directory exists with proper permissions
    await ensureDirectoryExists(logDir);
  } catch (error) {
    console.error('Failed to create logs directory:', error);
    if (!fs.existsSync(logDir)) {
      throw new Error(`Cannot proceed without logs directory: ${error.message}`);
    }
  }

  // Write one file per browser type
  for (const [browserId, logs] of browserLogs.entries()) {
    const logFile = path.join(logDir, `browser-console-logs-${browserId}.json`);
    let lockFile: LockRelease | null = null;
    
    try {
      // Ensure parent directory exists
      const logFileDir = path.dirname(logFile);
      await ensureDirectoryExists(logFileDir);

      // Create empty file if it doesn't exist
      if (!fs.existsSync(logFile)) {
        await fs.promises.writeFile(logFile, JSON.stringify(initializeLogs(browserId, timestamp), null, 2), { mode: 0o644 });
      }

      // Acquire lock with retries
      lockFile = await lockfile.lock(logFile, { 
        retries: {
          retries: 5,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 5000
        },
        stale: 30000
      });

      // Read existing logs
      let existingLogs;
      try {
        const content = await fs.promises.readFile(logFile, 'utf8');
        existingLogs = JSON.parse(content);
      } catch (e) {
        console.error(`Error reading existing logs for ${browserId}:`, e);
        existingLogs = initializeLogs(browserId, timestamp);
      }

      // Update timestamp and test runs
      existingLogs.lastUpdated = timestamp;
      if (!existingLogs.summary.testRuns.includes(TEST_RUN_ID)) {
        existingLogs.summary.testRuns.push(TEST_RUN_ID);
      }

      // Add new logs
      const newErrors = logs.errors.map(entry => ({
        ...entry,
        testRunId: TEST_RUN_ID,
        timestamp
      }));
      const newWarnings = logs.warnings.map(entry => ({
        ...entry,
        testRunId: TEST_RUN_ID,
        timestamp
      }));
      const newUnhandled = logs.unhandled.map(entry => ({
        ...entry,
        testRunId: TEST_RUN_ID,
        timestamp
      }));

      // Merge with existing logs
      existingLogs.logs.errors.push(...newErrors);
      existingLogs.logs.warnings.push(...newWarnings);
      existingLogs.logs.unhandled.push(...newUnhandled);

      // Deduplicate and merge logs
      existingLogs.logs.errors = mergeDuplicateLogs(existingLogs.logs.errors);
      existingLogs.logs.warnings = mergeDuplicateLogs(existingLogs.logs.warnings);
      existingLogs.logs.unhandled = mergeDuplicateLogs(existingLogs.logs.unhandled);

      // Update summary
      existingLogs.summary.totalErrors = existingLogs.logs.errors.reduce((sum, entry) => sum + (entry.count || 1), 0);
      existingLogs.summary.totalWarnings = existingLogs.logs.warnings.reduce((sum, entry) => sum + (entry.count || 1), 0);
      existingLogs.summary.totalUnhandled = existingLogs.logs.unhandled.reduce((sum, entry) => sum + (entry.count || 1), 0);

      // Collect all affected test names
      const allTestNames = new Set<string>();
      [...existingLogs.logs.errors, ...existingLogs.logs.warnings, ...existingLogs.logs.unhandled]
        .forEach(entry => {
          if (entry.testNames) {
            entry.testNames.forEach(testName => allTestNames.add(testName));
          }
        });
      existingLogs.summary.affectedTests = Array.from(allTestNames);

      // Sort all logs by timestamp (newest first)
      existingLogs.logs.errors.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      existingLogs.logs.warnings.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      existingLogs.logs.unhandled.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      // Write consolidated logs
      await fs.promises.writeFile(
        logFile,
        JSON.stringify(existingLogs, null, 2),
        { mode: 0o644 }
      );
      console.log(`Consolidated logs written to ${logFile}`);

    } catch (error) {
      console.error(`Error processing logs for ${browserId}:`, error);
      throw error;
    } finally {
      if (lockFile) {
        try {
          await lockFile();
        } catch (e) {
          if (e.code !== 'ENOENT') {
            console.error(`Error releasing lock for ${logFile}:`, e);
          }
        }
      }
    }
  }
}

// Helper to format test error details
function formatTestError(error: any, testName?: string): LogEntry {
  const timestamp = new Date().toISOString();
  let message = error.message || 'Unknown error';
  let location = { url: 'unknown', lineNumber: 0 };
  
  // Extract location from Playwright error
  if (error[Symbol.for('step')]?.location) {
    const stepLocation = error[Symbol.for('step')].location;
    location = {
      url: stepLocation.file,
      lineNumber: stepLocation.line
    };
  } else if (error.stack) {
    // Try to extract location from stack trace
    const stackLines = error.stack.split('\n');
    const fileLine = stackLines.find(line => line.includes('tests/'));
    if (fileLine) {
      const match = fileLine.match(/at .+ \((.+):(\d+):(\d+)\)/);
      if (match) {
        location = {
          url: match[1],
          lineNumber: parseInt(match[2])
        };
      }
    }
  }

  // Format Playwright-specific errors
  if (error.name === 'TimeoutError') {
    const callLog = error[Symbol.for('step')]?.params?.callLog || [];
    message = `Timeout: ${message}\nCall log:\n${callLog.map((log: string) => `  - ${log}`).join('\n')}`;
  }

  return {
    timestamp,
    type: 'TEST_ERROR',
    message,
    location,
    count: 1,
    testNames: testName ? [testName] : []
  };
}

// Helper to filter out common third-party warnings
export function shouldLogConsoleMessage(msg: any): boolean {
  const text = msg.text();
  const type = msg.type();
  
  // Skip LOG type messages entirely
  if (type === 'log') {
    return false;
  }

  // For errors, we want to log:
  // 1. Test infrastructure errors
  // 2. Form validation errors
  // 3. API/network errors that affect signup
  // 4. JavaScript errors in our application code
  // 5. Navigation/redirect issues
  // 6. Modal interaction problems
  // 7. Input field accessibility issues
  // 8. Test timeouts and failures
  if (type === 'error') {
    // These are errors we want to log (inverse of ignored)
    const importantErrors = [
      // Test infrastructure
      'Test was interrupted',
      'Target page, context or browser has been closed',
      'Test ended',
      'Timeout',
      'waiting for',
      'locator.waitFor',
      'locator.click',
      'locator.fill',
      // Form validation
      'validation',
      'required field',
      'invalid input',
      // API/Network errors affecting signup
      'failed to fetch',
      'network error',
      'api error',
      // Application errors
      'allo',
      'signup',
      'service',
      // Navigation/Redirect
      'redirect',
      'navigation',
      // Modal/UI
      'modal',
      'dialog',
      'popup',
      // Accessibility
      'aria',
      'accessibility',
      'focus'
    ];

    // If it contains any of our important error keywords, log it
    if (importantErrors.some(error => text.toLowerCase().includes(error))) {
      return true;
    }

    // Otherwise, filter out common third-party and expected errors
    const ignoredErrors = [
      // Browser/Test environment specific
      'WebContentsDelegate::CheckMediaAccessPermission',
      'Automatic fallback to software WebGL',
      'UDP send of',
      'STUN port',
      // Content Security Policy (expected in test environment)
      'Content-Security-Policy',
      'TrustedScript',
      'frame-ancestors',
      // Third-party service errors (don't affect core functionality)
      'LaunchDarkly',
      'Google Tag Manager',
      'YouTube',
      'Olark',
      'Google Analytics',
      // Resource loading errors that don't affect functionality
      'Failed to load resource: the server responded with a status of 404',
      'Failed to load resource: the server responded with a status of 401'
    ];
    return !ignoredErrors.some(error => text.includes(error));
  }
  
  // For warnings and info, we only want to log:
  // 1. Test infrastructure warnings
  // 2. Deprecation warnings in our code
  // 3. Performance issues
  // 4. Security warnings
  const importantWarnings = [
    // Test infrastructure
    'Test timeout',
    'Test retry',
    'Browser context',
    // Code quality
    'deprecated',
    'performance',
    'security',
    'vulnerability'
  ];

  if (importantWarnings.some(warning => text.toLowerCase().includes(warning))) {
    return true;
  }

  // Filter out common third-party warnings and info messages
  const ignoredMessages = [
    // Browser/Test environment
    'WebContentsDelegate',
    'WebGL',
    'STUN',
    'UDP',
    // Third-party services
    'LaunchDarkly',
    'Google Analytics',
    'Olark',
    'YouTube',
    // Browser/Environment
    'Quirks Mode',
    'InstallTrigger',
    'sendBeacon',
    // Font/Resource loading
    'font',
    'Glyph',
    'Font Awesome',
    'icomoon',
    // Common warnings
    'unreachable code',
    'JQMIGRATE',
    'cookie',
    'market',
    // Olark specific
    'gtag() did not exist',
    'Google Analytics Integration',
    // Resource loading
    'Images loaded lazily',
    'Load events are deferred'
  ];
  
  return !ignoredMessages.some(message => text.includes(message));
}

// Helper to format console messages with more context
export function formatConsoleMessage(msg: any, isDuplicate: boolean = false): string {
  const type = msg.type().toUpperCase();
  const text = msg.text();
  const location = msg.location();
  
  // For errors, include location and stack if available
  if (type === 'ERROR') {
    let formatted = `[Browser ${type}] ${text}`;
    if (location) {
      formatted += `\n  at ${location.url}:${location.lineNumber}`;
    }
    if (isDuplicate) {
      const count = seenErrors.get(getMessageKey(msg)) || 1;
      formatted += `\n  (This error occurred ${count} times)`;
    }
    return formatted;
  }
  
  return `[Browser ${type}] ${text}`;
}

// Helper to create a log entry from a console message
function createLogEntryFromConsole(msg: any, count?: number, testName?: string): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: msg.type().toUpperCase(),
    message: msg.text(),
    location: msg.location(),
    count,
    testNames: testName ? [testName] : []
  };
  
  // Remove testName since we're using testNames array
  delete entry.testName;
  return entry;
}

// Setup console logging for a page
export async function setupConsoleLogging(page: Page, testName?: string): Promise<void> {
  const browserId = await getBrowserId(page);
  
  // Initialize logs for this browser if not exists
  if (!browserLogs.has(browserId)) {
    browserLogs.set(browserId, {
      errors: [],
      warnings: [],
      unhandled: [],
      testRuns: []  // Array instead of Set
    });
  }
  
  const logs = browserLogs.get(browserId)!;
  if (!logs.testRuns.includes(TEST_RUN_ID)) {
    logs.testRuns.push(TEST_RUN_ID);
  }
  
  // Clear seen messages when setting up new page
  seenMessages.clear();
  seenErrors.clear();
  
  // Listen to console messages with filtering and formatting
  page.on('console', msg => {
    if (shouldLogConsoleMessage(msg)) {
      const messageKey = getLogEntryKey(createLogEntryFromConsole(msg));
      const errorCount = seenErrors.get(messageKey);
      const isDuplicate = msg.type() === 'error' && errorCount !== undefined && errorCount > 1;
      
      // Only log first occurrence or every 10th for errors
      if (msg.type() === 'error') {
        const count = (errorCount || 0) + 1;
        seenErrors.set(messageKey, count);
        
        if (count === 1 || count % 10 === 0) {
          logs.errors.push(createLogEntryFromConsole(msg, count, testName));
        }
      } else if (!seenMessages.has(messageKey)) {
        // Only log warnings once
        seenMessages.add(messageKey);
        logs.warnings.push(createLogEntryFromConsole(msg, undefined, testName));
      }
    }
  });

  // Handle unhandled rejections and test errors
  page.on('pageerror', error => {
    const errorEntry = formatTestError(error, testName);
    logs.unhandled.push(errorEntry);
  });

  // Handle test failures
  page.on('crash', error => {
    const errorEntry = formatTestError(error, testName);
    logs.errors.push(errorEntry);
  });
}

// Update flushLogs to be async
export async function flushLogs(): Promise<void> {
  await writeLogsToFile();
}

// Export function to clear logs (call this at the start of a new test run)
export function clearLogs(): void {
  browserLogs.clear();
  seenMessages.clear();
  seenErrors.clear();
}

// Export function to log test errors
export function logTestError(error: any, testName?: string): void {
  const browserId = 'test-runner';  // Use a special browser ID for test errors
  if (!browserLogs.has(browserId)) {
    browserLogs.set(browserId, {
      errors: [],
      warnings: [],
      unhandled: [],
      testRuns: []  // Array instead of Set
    });
  }
  
  const logs = browserLogs.get(browserId)!;
  const errorEntry = formatTestError(error, testName);
  logs.errors.push(errorEntry);
}

// Update the log initialization
function initializeLogs(browserId: string, timestamp: string) {
  return {
    browser: browserId,
    lastUpdated: timestamp,
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      totalUnhandled: 0,
      testRuns: [],  // Array instead of Set
      affectedTests: []  // Array instead of Set
    },
    logs: {
      errors: [],
      warnings: [],
      unhandled: []
    }
  };
} 