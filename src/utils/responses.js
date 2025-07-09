/**
 * Response utilities for consistent MCP tool responses
 */

import { ResponseFactory } from '../core/enhanced-response.js';
import { toLegacyResponse } from './enhanced-response-utils.js';

/**
 * Create a success response (legacy format for backward compatibility)
 */
export function createSuccessResponse(message, data = {}) {
  const enhanced = ResponseFactory.success(message, data);
  return toLegacyResponse(enhanced);
}

/**
 * Create an error response (legacy format for backward compatibility)
 */
export function createErrorResponse(message, error = null) {
  const enhanced = ResponseFactory.error(message, error);
  return toLegacyResponse(enhanced);
}

/**
 * Create a status response (legacy format for backward compatibility)
 */
export function createStatusResponse(status, message, data = {}) {
  const enhanced = ResponseFactory.info(message, data);
  enhanced.originalStatus = status; // Mark for legacy conversion
  return toLegacyResponse(enhanced);
}

/**
 * Format tool response for MCP
 */
export function formatMCPResponse(result) {
  if (typeof result === "string") {
    return { text: result };
  }

  if (result.success !== undefined) {
    const icon = result.success ? "✅" : "❌";
    const text = `${icon} ${result.message}${result.data ? "\n\n" + JSON.stringify(result.data, null, 2) : ""}`;
    return { text };
  }

  return { text: JSON.stringify(result, null, 2) };
}

// Export enhanced response utilities for gradual migration
export { ResponseFactory } from '../core/enhanced-response.js';
export { fromLegacyResponse, toLegacyResponse } from './enhanced-response-utils.js';
