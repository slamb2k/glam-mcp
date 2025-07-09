/**
 * Platform-specific configuration generators
 */

export { claudeDesktopGenerator } from './claude-desktop.js';
export { vscodeGenerator } from './vscode.js';

// Register all platforms with the main generator
import { configGenerator } from '../config-generator.js';
import { claudeDesktopGenerator } from './claude-desktop.js';
import { vscodeGenerator } from './vscode.js';

// Register platforms
configGenerator.registerPlatform('claude-desktop', claudeDesktopGenerator);
configGenerator.registerPlatform('vscode', vscodeGenerator);
configGenerator.registerPlatform('cline', vscodeGenerator);
configGenerator.registerPlatform('continue', vscodeGenerator);
configGenerator.registerPlatform('cursor', vscodeGenerator);