import { Router } from 'express';

const router = Router();

// Base routes
router.get('/', (req, res) => {
  res.json({
    message: 'Slambed MCP API',
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  });
});

// API v1 routes
router.get('/api/v1', (req, res) => {
  res.json({
    version: 'v1',
    endpoints: {
      context: '/api/v1/context',
      slam: '/api/v1/slam',
      workflows: '/api/v1/workflows'
    }
  });
});

export default router;