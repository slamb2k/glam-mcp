import { slam } from '../src/mcp/tools/slam.js';
import contextEngine from '../src/mcp/context-engine.js';

async function testSlam() {
  console.log('Testing SLAM natural language interface...\n');
  
  const testCommands = [
    'help',
    'show status',
    'commit my changes',
    'push to remote',
    'create feature branch',
    'what is the context',
    'run tests',
    'deploy to production',
    'collaborate with team',
    'merge feature into main'
  ];
  
  for (const command of testCommands) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Command: "${command}"`);
    console.log(${'='.repeat(50)});
    
    try {
      const result = await slam(command);
      console.log(result.output);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  // Clean up
  await contextEngine.dispose();
}

// Run tests
testSlam().catch(console.error);