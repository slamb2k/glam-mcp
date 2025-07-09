import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  getBanner, 
  getCompactBanner, 
  getMinimalBanner, 
  showBanner, 
  getWelcomeMessage 
} from '../../../src/utils/banner.js';

describe('Banner Utilities', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('getBanner', () => {
    it('should return full ASCII art banner', () => {
      const banner = getBanner();
      
      // Check for presence of box drawing characters
      expect(banner).toContain('██████╗');
      expect(banner).toContain('╚═════╝');
      expect(banner).toContain('███╗');
      expect(banner).toContain('██║');
      // The banner contains ASCII art for GLAM-MCP
      expect(banner).toBeTruthy();
      expect(banner.length).toBeGreaterThan(100);
    });
  });

  describe('getCompactBanner', () => {
    it('should return compact banner with version', () => {
      const banner = getCompactBanner();
      
      expect(banner).toContain('glam-mcp v2.0');
      expect(banner).toContain('Git Learning & Automation Module');
      expect(banner).toContain('╔═══════════════════════════════════════╗');
      expect(banner).toContain('╚═══════════════════════════════════════╝');
    });
  });

  describe('getMinimalBanner', () => {
    it('should return minimal one-line banner', () => {
      const banner = getMinimalBanner();
      
      expect(banner).toBe('glam-mcp | Git Learning & Automation Module');
    });
  });

  describe('showBanner', () => {
    it('should display full banner by default', () => {
      showBanner();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\x1b[36m%s\x1b[0m',
        expect.stringContaining('██████╗')
      );
    });

    it('should display compact banner when specified', () => {
      showBanner('compact');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\x1b[36m%s\x1b[0m',
        expect.stringContaining('glam-mcp v2.0')
      );
    });

    it('should display minimal banner when specified', () => {
      showBanner('minimal');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\x1b[36m%s\x1b[0m',
        'glam-mcp | Git Learning & Automation Module'
      );
    });

    it('should default to full banner for invalid style', () => {
      showBanner('invalid');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\x1b[36m%s\x1b[0m',
        expect.stringContaining('██████╗')
      );
    });
  });

  describe('getWelcomeMessage', () => {
    it('should return welcome message with features', () => {
      const message = getWelcomeMessage();
      
      expect(message).toContain('Welcome to glam-mcp');
      expect(message).toContain('intelligent development companion');
      expect(message).toContain('Smart Git workflow automation');
      expect(message).toContain('Contextual AI assistance');
      expect(message).toContain('Team collaboration tools');
      expect(message).toContain('Safety checks and risk analysis');
      expect(message).toContain('Connected via MCP');
    });
  });
});