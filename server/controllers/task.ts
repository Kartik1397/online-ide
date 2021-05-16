import { v4 as uuid4 } from 'uuid';

const tasks: any = {};
const id_status: any = {};

export const create = (req: any, res: any) => {
  const task = {
    ...req.body,
    _id: uuid4(),
    err: "",
    stdout: "",
    stderr: "",
    status: "pending"
  };

  tasks[task._id] = task;
  console.log(task);

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

export const submit = (req: any, res: any) => {
  var completed_task = req.body;
  tasks[completed_task._id].status = 'completed';
  tasks[completed_task._id].stdout = completed_task.stdout;
  tasks[completed_task._id].stderr = completed_task.stderr;
  tasks[completed_task._id].err = completed_task.err;
  if (completed_task._id in id_status) {
    id_status[completed_task._id].write(`data: ${JSON.stringify({status: "completed", data: tasks[completed_task._id]})}\n\n`)
    id_status[completed_task._id].end();
  }
  console.log(tasks[completed_task._id]);
  res.send(JSON.stringify("submitted"));
}

export const assing = (req: any, res: any) => {
  if (Object.keys(tasks).filter(key => tasks[key].status === 'pending').length > 0) {
    const id = Object.keys(tasks).filter(key => tasks[key].status === 'pending')[0];
    if (id in id_status) {
      id_status[id].write(`data: ${JSON.stringify({status: "running"})}\n\n`)
    }
    tasks[id].status = "running";
    console.log(tasks[id]);
    res.json(tasks[id]);
  } else {
    res.json({});
  }
}

export const all = (req: any, res: any) => {
  console.log(tasks);
  res.json(tasks);
}