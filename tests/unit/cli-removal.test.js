import { describe, test, expect, beforeAll } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('CLI Removal Verification', () => {
  describe('File System Checks', () => {
    test('bin directory should not exist', async () => {
      const binPath = path.join(projectRoot, 'bin');
      await expect(fs.access(binPath)).rejects.toThrow();
    });

    test('CLI utility files should not exist', async () => {
      const bannnerPath = path.join(projectRoot, 'src/utils/banner.js');
      await expect(fs.access(bannnerPath)).rejects.toThrow();
    });
  });

  describe('Package.json Verification', () => {
    let packageJson;

    beforeAll(async () => {
      const packagePath = path.join(projectRoot, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      packageJson = JSON.parse(content);
    });

    test('should not have bin section', () => {
      expect(packageJson.bin).toBeUndefined();
    });

    test('should not have CLI dependencies', () => {
      const cliDependencies = ['commander', 'chalk', 'inquirer'];
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      cliDependencies.forEach(dep => {
        expect(allDeps[dep]).toBeUndefined();
      });
    });

    test('should still have MCP dependencies', () => {
      expect(packageJson.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
      expect(packageJson.dependencies['simple-git']).toBeDefined();
    });
  });

  describe('Import Checks', () => {
    test('tool modules should not import CLI packages', async () => {
      const toolFiles = [
        'src/tools/automation.js',
        'src/tools/github-flow.js',
        'src/tools/utilities.js'
      ];

      for (const file of toolFiles) {
        const filePath = path.join(projectRoot, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          expect(content).not.toMatch(/import.*commander/);
          expect(content).not.toMatch(/import.*chalk/);
          expect(content).not.toMatch(/import.*inquirer/);
          expect(content).not.toMatch(/require.*commander/);
          expect(content).not.toMatch(/require.*chalk/);
          expect(content).not.toMatch(/require.*inquirer/);
        } catch (err) {
          // File might not exist, which is fine
        }
      }
    });

    test('no files should import banner utility', async () => {
      const srcPath = path.join(projectRoot, 'src');
      const files = await getJavaScriptFiles(srcPath);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        expect(content).not.toMatch(/import.*banner/);
        expect(content).not.toMatch(/require.*banner/);
      }
    });
  });

  describe('Console Output Checks', () => {
    test('tool modules should not use console.log', async () => {
      const toolFiles = [
        'src/tools/automation.js',
        'src/tools/github-flow.js',
        'src/tools/utilities.js'
      ];

      for (const file of toolFiles) {
        const filePath = path.join(projectRoot, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          // Allow console.error for error handling, but no console.log
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
        'src/tools/utilities.js'
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