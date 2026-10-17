import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.get('/test', (req, res) => {
  res.send('proxy alive');
});

app.use(
  '/api',
  createProxyMiddleware({
    target: 'http://localhost:11434',
    changeOrigin: true
  })
);

app.use(express.static('./ui'));

app.listen(3001, () => {
  console.log('Proxy server running at http://localhost:3001');
});