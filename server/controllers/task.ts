import { v4 as uuid4 } from 'uuid';
import { Client as WebSocket } from 'rpc-websockets';

const ws = new WebSocket(`ws://${process.env.WORKER_URI}`);
ws.on('open', () => console.log('websocket opened'));
ws.on('close', () => console.log('websocket closed'));

const id_status: any = {};

export const create = (req: any, res: any) => {
  const task = {
    _id: uuid4(),
    err: "",
    stdout: "",
    stderr: "",
    status: "pending"
  };

  ws.call('runCode', {code: req.body.code, input: req.body.input, _id: task._id})
    .then((id) => {
      ws.subscribe(task._id);
      ws.on(task._id, (data) => {
        switch (data.type) {
          case 'QUEUED':
            task.status = "Queued";
            break;
          case 'RUNNING':
            task.status = "Running";
            break;
          case 'COMPILATION_FAILED':
          case'RE':
          case 'TE':
          case 'MLE':
          case 'SUCCESS':
            task.status = "Completed";
            task.stderr = data.stderr;
            task.stdout = data.stdout;
            break;
          default:
            break;
        }
        if (task._id in id_status) {
          id_status[task._id].write(`data: ${JSON.stringify(task)}\n\n`);
        }
      })
    })
    .catch((e) => console.log(e));
  res.json(task);
}

export const find_by_id = (req: any, res: any) => {
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  id_status[req.params.taskId] = res;

  res.on('close', () => {
    delete id_status[req.params.taskId];
  })
}