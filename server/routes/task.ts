import express from 'express';
import * as task from '../controllers/task';

const router = express.Router();

router.get('/', function(req, res) {
  res.send(JSON.stringify("hello"));
});

router.post('/create', task.create);
router.get('/assign', task.assing);
router.post('/submit', task.submit);
router.get('/all', task.all);
router.get('/:taskId', task.find_by_id);

export default router;