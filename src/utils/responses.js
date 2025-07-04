/**
 * Response utilities for consistent MCP tool responses
 */

/**
 * Create a success response
 */
export function createSuccessResponse(message, data = {}) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(message, error = null) {
  return {
    success: false,
    message,
    error: error?.message || error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a status response
 */
export function createStatusResponse(status, message, data = {}) {
  return {
    status,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
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
