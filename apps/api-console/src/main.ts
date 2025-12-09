import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env['WEB_CONSOLE_URL'] || 'http://localhost:3000',
    credentials: true,
  })
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api/v1/hello', (c) => {
  return c.json({ message: 'Hello from API Console' });
});

// Users management routes (placeholder)
app.get('/api/v1/users', (c) => {
  return c.json({ users: [], message: 'User management endpoint' });
});

// Service activation routes (placeholder)
app.get('/api/v1/services', (c) => {
  return c.json({ services: [], message: 'Service management endpoint' });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

const port = Number(process.env['PORT']) || 3001;

console.log(`🚀 API Console server starting on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
