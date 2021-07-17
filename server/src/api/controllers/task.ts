import { v4 as uuid4 } from 'uuid';
import { Client as WebSocket } from 'rpc-websockets';
import { Request, Response } from 'express';

const ws = new WebSocket(`ws://${process.env.WORKER_URI}`, { max_reconnects: 0 });

const queue: Number[] = [];
let workerOnline = false;
ws.on('open', () => {
  console.log('websocket opened')
  workerOnline = true;
  queue.forEach((eventStreamId: Number) => {
    sendWorkerStatusToClient(eventStreamId);
  });
});
ws.on('close', () =>{
  console.log('websocket closed')
  workerOnline = false;
});

const id_status: any = {};

const QUEUED = 'QUEUED';
const RUNNING = 'RUNNING';
const SERVER_UP = 'SERVER_UP';
const WORKER_UP = 'WORKER_UP';
const COMPLETED = 'COMPLETED';

export const create = (req: Request, res: Response) => {
  const task = {
    _id: uuid4(),
    err: "",
    stdout: "",
    stderr: "",
    status: "pending",
    signal: ""
  };

  const { code, input, eventStreamId } = req.body;

  ws.call('runCode', { code: code, input: input, _id: task._id })
    .then((id: any) => {
      ws.subscribe(task._id);
      ws.on(task._id, (data: any) => {
        switch (data.type) {
          case 'QUEUED':
            task.status = QUEUED;
            break;
          case 'RUNNING':
            task.status = RUNNING;
            break;
          case 'COMPILATION_FAILED':
            task.status = COMPLETED;
            task.err = data.stderr;
            task.signal = data.signal;
            break;
          case 'RE':
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
    .catch((e: any) => console.log(e));
  res.json(task);
}

function sendWorkerStatusToClient(eventStreamId: any) {
  if (workerOnline === false) {
    queue.push(eventStreamId);
    return;
  }
  ws.call('status').then((ret: any) => {
    if (ret === 'up' && id_status[eventStreamId]) {
      id_status[eventStreamId].write(`data: ${JSON.stringify({ status: WORKER_UP })}\n\n`)
    }
  }).catch((e: any) => {
    setTimeout(() => sendWorkerStatusToClient(id_status[eventStreamId]), 2000);
    console.log(e);
  });
}

export const events = (req: Request, res: Response) => {
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

  res.write(`data: ${JSON.stringify({ status: SERVER_UP, eventStreamId })}\n\n`);

  sendWorkerStatusToClient(eventStreamId);
}
