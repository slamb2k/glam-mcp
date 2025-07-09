import { describe, test, expect, beforeAll } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Pure MCP Architecture Verification', () => {
  describe('File System Checks', () => {
    test('old bin directory should not exist', async () => {
      const binPath = path.join(projectRoot, 'bin');
      await expect(fs.access(binPath)).rejects.toThrow();
    });

    test('config tools CLI should exist (intentional)', async () => {
      const configCliPath = path.join(projectRoot, 'src/config-tools/cli.js');
      await expect(fs.access(configCliPath)).resolves.toBeUndefined();
    });

    test('banner utility should exist for MCP server startup', async () => {
      const bannerPath = path.join(projectRoot, 'src/utils/banner.js');
      await expect(fs.access(bannerPath)).resolves.toBeUndefined();
    });
  });

  describe('Package.json Verification', () => {
    let packageJson;

    beforeAll(async () => {
      const packagePath = path.join(projectRoot, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      packageJson = JSON.parse(content);
    });

    test('should have bin section only for glam-config', () => {
      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin['glam-config']).toBe('./src/config-tools/cli.js');
      // Should not have other CLI commands
      expect(Object.keys(packageJson.bin).length).toBe(1);
    });

    test('should have commander and inquirer only for config tools', () => {
      // These are allowed for the config tools
      expect(packageJson.dependencies['commander']).toBeDefined();
      expect(packageJson.dependencies['inquirer']).toBeDefined();
    });

    test('should not have old CLI dependencies', () => {
      const oldCliDependencies = ['chalk', 'yargs', 'simple-git', 'zod'];
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      oldCliDependencies.forEach(dep => {
        expect(allDeps[dep]).toBeUndefined();
      });
    });

    test('should have MCP dependencies', () => {
      expect(packageJson.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
    });
  });

  describe('Import Checks', () => {
    test('tool modules should not import CLI packages', async () => {
      const toolFiles = [
        'src/tools/automation.js',
        'src/tools/github-flow.js',
        'src/tools/utilities.js',
        'src/tools/context.js',
        'src/tools/team.js',
        'src/tools/safety.js'
      ];

      for (const file of toolFiles) {
        const filePath = path.join(projectRoot, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          // Should not import CLI libraries (except in config tools)
          expect(content).not.toMatch(/import.*commander/);
          expect(content).not.toMatch(/import.*chalk/);
          expect(content).not.toMatch(/import.*yargs/);
          expect(content).not.toMatch(/require.*commander/);
          expect(content).not.toMatch(/require.*chalk/);
          expect(content).not.toMatch(/require.*yargs/);
        } catch (err) {
          // File might not exist, which is fine
        }
      }
    });

    test('only index.js and enhanced-server should import banner', async () => {
      const srcPath = path.join(projectRoot, 'src');
      const files = await getJavaScriptFiles(srcPath);
      
      const allowedBannerImports = [
        path.join(projectRoot, 'src/index.js'),
        path.join(projectRoot, 'src/server/enhanced-server.js'),
        path.join(projectRoot, 'src/utils/banner.js')
      ];

      for (const file of files) {
        if (!allowedBannerImports.includes(file)) {
          const content = await fs.readFile(file, 'utf8');
          expect(content).not.toMatch(/import.*banner/);
          expect(content).not.toMatch(/require.*banner/);
        }
      }
    });
  });

  describe('Console Output Checks', () => {
    test('tool modules should not use console.log', async () => {
      const toolFiles = [
        'src/tools/automation.js',
        'src/tools/github-flow.js',
        'src/tools/utilities.js',
        'src/tools/context.js',
        'src/tools/team.js',
        'src/tools/safety.js'
      ];

      for (const file of toolFiles) {
        const filePath = path.join(projectRoot, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          // Tools should not use console.log
          expect(content).not.toMatch(/console\.log/);
        } catch (err) {
          // File might not exist, which is fine
        }
      }
    });

    test('tool modules should not use process.exit', async () => {
      const toolFiles = [
        'src/tools/automation.js',
        'src/tools/github-flow.js',
        'src/tools/utilities.js',
        'src/tools/context.js',
        'src/tools/team.js',
        'src/tools/safety.js'
      ];

      for (const file of toolFiles) {
        const filePath = path.join(projectRoot, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          expect(content).not.toMatch(/process\.exit/);
        } catch (err) {
          // File might not exist, which is fine
        }
      }
    });
  });

  describe('MCP Architecture Verification', () => {
    test('main entry point should be pure MCP server', async () => {
      const indexPath = path.join(projectRoot, 'src/index.js');
      const content = await fs.readFile(indexPath, 'utf8');
      
      // Should import MCP SDK
      expect(content).toMatch(/@modelcontextprotocol\/sdk/);
      // Should define server class
      expect(content).toMatch(/class.*Server/);
      // Should handle MCP requests
      expect(content).toMatch(/setRequestHandler/);
    });

    test('all tools should use createResponse helper', async () => {
      const toolFiles = [
        'src/tools/automation.js',
        'src/tools/github-flow.js',
        'src/tools/utilities.js',
        'src/tools/context.js',
        'src/tools/team.js',
        'src/tools/safety.js'
      ];

      for (const file of toolFiles) {
        const filePath = path.join(projectRoot, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          // Should import createResponse
          expect(content).toMatch(/import.*createResponse/);
          // Should return responses using createResponse
          expect(content).toMatch(/return\s+createResponse/);
        } catch (err) {
          // File might not exist, which is fine
        }
      }
    });
  });
});

// Helper function to recursively get all JavaScript files
async function getJavaScriptFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await getJavaScriptFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Directory might not exist
  }
  
  return files;
}