import { v4 as uuid4 } from 'uuid';
import { Client as WebSocket } from 'rpc-websockets';

const ws = new WebSocket(`ws://${process.env.WORKER_URI}`);
ws.on('open', () => console.log('websocket opened'));
ws.on('close', () => console.log('websocket closed'));

const id_status: any = {};

const QUEUED = 'QUEUED';
const RUNNING = 'RUNNING';
const SERVER_UP = 'SERVER_UP';
const WORKER_UP = 'WORKER_UP';
const COMPLETED = 'COMPLETED';

export const create = (req: any, res: any) => {
  const task = {
    _id: uuid4(),
    err: "",
    stdout: "",
    stderr: "",
    status: "pending"
  };

  const {code, input, eventStreamId} = req.body;

  ws.call('runCode', {code: code, input: input, _id: task._id})
    .then((id) => {
      ws.subscribe(task._id);
      ws.on(task._id, (data) => {
        switch (data.type) {
          case 'QUEUED':
            task.status = QUEUED;
            break;
          case 'RUNNING':
            task.status = RUNNING;
            break;
          case 'COMPILATION_FAILED':
          case'RE':
          case 'TE':
          case 'MLE':
          case 'SUCCESS':
            task.status = COMPLETED;
            task.stderr = data.stderr;
            task.stdout = data.stdout;
            break;
          default:
            break;
        }
        if (eventStreamId in id_status) {
          id_status[eventStreamId].write(`data: ${JSON.stringify(task)}\n\n`);
        }
      })
    })
    .catch((e) => console.log(e));
  res.json(task);
}

export const events = (req: any, res: any) => {
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  const eventStreamId = uuid4();
  id_status[eventStreamId] = res;

  res.on('close', () => {
    delete id_status[eventStreamId];
  })

  res.write(`data: ${JSON.stringify({status: SERVER_UP, eventStreamId })}\n\n`);

  ws.call('status').then(ret => {
    if (ret === 'up') {
      res.write(`data: ${JSON.stringify({status: WORKER_UP})}\n\n`)
    }
  })
}