/**
 * Security Event Logger
 * Logs security-relevant events for monitoring and incident response
 */

type SecurityEventType = 
  | 'signature_request'
  | 'signature_success'
  | 'signature_failed'
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'rate_limit_hit'
  | 'invalid_input'
  | 'suspicious_activity'
  | 'session_expired'
  | 'auth_failed';

interface SecurityEvent {
  type: SecurityEventType;
  severity: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  walletAddress?: string;
  chainType?: string;
  metadata?: Record<string, unknown>;
}

// In-memory security log (last 100 events)
const securityLog: SecurityEvent[] = [];
const MAX_EVENTS = 100;

/**
 * Log a security event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  message: string,
  options: {
    severity?: 'info' | 'warn' | 'error';
    walletAddress?: string;
    chainType?: string;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  const event: SecurityEvent = {
    type,
    severity: options.severity || 'info',
    message,
    timestamp: new Date().toISOString(),
    walletAddress: options.walletAddress,
    chainType: options.chainType,
    metadata: options.metadata,
  };
  
  // Add to log
  securityLog.push(event);
  if (securityLog.length > MAX_EVENTS) {
    securityLog.shift();
  }
  
  // Console logging based on severity
  if (import.meta.env.DEV) {
    const prefix = `[Security:${type}]`;
    switch (event.severity) {
      case 'error':
        console.error(prefix, message, event.metadata);
        break;
      case 'warn':
        console.warn(prefix, message, event.metadata);
        break;
      default:
        console.log(prefix, message, event.metadata);
    }
  }
}

/**
 * Log a signature request
 */
export function logSignatureRequest(
  walletAddress: string,
  chainType: string,
  action: string
): void {
  logSecurityEvent('signature_request', `Signature requested for ${action}`, {
    severity: 'info',
    walletAddress,
    chainType,
    metadata: { action },
  });
}

/**
 * Log a successful signature
 */
export function logSignatureSuccess(
  walletAddress: string,
  chainType: string,
  action: string
): void {
  logSecurityEvent('signature_success', `Signature verified for ${action}`, {
    severity: 'info',
    walletAddress,
    chainType,
    metadata: { action },
  });
}

/**
 * Log a failed signature
 */
export function logSignatureFailed(
  walletAddress: string,
  chainType: string,
  reason: string
): void {
  logSecurityEvent('signature_failed', `Signature verification failed: ${reason}`, {
    severity: 'warn',
    walletAddress,
    chainType,
    metadata: { reason },
  });
}

/**
 * Log wallet connection
 */
export function logWalletConnected(
  walletAddress: string,
  chainType: string,
  walletName?: string
): void {
  logSecurityEvent('wallet_connected', `Wallet connected: ${walletName || chainType}`, {
    severity: 'info',
    walletAddress,
    chainType,
    metadata: { walletName },
  });
}

/**
 * Log wallet disconnection
 */
export function logWalletDisconnected(
  walletAddress: string,
  chainType: string
): void {
  logSecurityEvent('wallet_disconnected', 'Wallet disconnected', {
    severity: 'info',
    walletAddress,
    chainType,
  });
}

/**
 * Log rate limit hit
 */
export function logRateLimitHit(
  endpoint: string,
  walletAddress?: string
): void {
  logSecurityEvent('rate_limit_hit', `Rate limit exceeded for ${endpoint}`, {
    severity: 'warn',
    walletAddress,
    metadata: { endpoint },
  });
}

/**
 * Log invalid input attempt
 */
export function logInvalidInput(
  field: string,
  value: string,
  reason: string
): void {
  // Sanitize the value to avoid logging sensitive data
  const sanitizedValue = value.length > 20 ? `${value.slice(0, 20)}...` : value;
  
  logSecurityEvent('invalid_input', `Invalid input for ${field}: ${reason}`, {
    severity: 'warn',
    metadata: { field, valuePreview: sanitizedValue, reason },
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(
  description: string,
  metadata?: Record<string, unknown>
): void {
  logSecurityEvent('suspicious_activity', description, {
    severity: 'error',
    metadata,
  });
}

/**
 * Get all security events
 */
export function getSecurityEvents(): SecurityEvent[] {
  return [...securityLog];
}

/**
 * Get security events by type
 */
export function getSecurityEventsByType(type: SecurityEventType): SecurityEvent[] {
  return securityLog.filter(e => e.type === type);
}

/**
 * Get security events by severity
 */
export function getSecurityEventsBySeverity(severity: 'info' | 'warn' | 'error'): SecurityEvent[] {
  return securityLog.filter(e => e.severity === severity);
}

/**
 * Clear security log
 */
export function clearSecurityLog(): void {
  securityLog.length = 0;
}

/**
 * Export security log for analysis
 */
export function exportSecurityLog(): string {
  return JSON.stringify(securityLog, null, 2);
}
