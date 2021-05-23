import { v4 as uuid4 } from 'uuid';
import * as grpc from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';

const PROTO_PATH = __dirname + '/../protos/worker.proto';

var packageDefinition = loadSync(
  PROTO_PATH,
  {keepCase: true,
   longs: String,
   enums: String,
   defaults: true,
   oneofs: true
  });

const worker: any = grpc.loadPackageDefinition(packageDefinition).worker;
const client: any = new worker.Worker('worker:5000', grpc.credentials.createInsecure());

const id_status: any = {};

export const create = (req: any, res: any) => {
  const task = {
    _id: uuid4(),
    err: "",
    stdout: "",
    stderr: "",
    status: "pending"
  };

  console.log(task);

  client.runCode({code: req.body.code, input: req.body.input})
    .on('data', (data: any) => {
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
        console.log("Hi");
        id_status[task._id].write(`data: ${JSON.stringify(task)}\n\n`);
      }
    })
    .on('end', () => {
      console.log('end')
    });

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
