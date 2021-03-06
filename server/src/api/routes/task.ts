import express from 'express';
import * as task from '../controllers/task';
import rateLimit from 'express-rate-limit';

const rateLimiter = rateLimit({
  windowMs: 1000 * 10, // 24 hrs in milliseconds
  max: 1,
  message: '',
  headers: true,
});

const router = express.Router();

router.get('/', (req, res) => { res.send(JSON.stringify("hello")); });
router.post('/create', rateLimiter, task.create);
router.get('/events', task.events);

export default router;