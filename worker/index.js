const fs = require('fs');
const exec = require('child_process').exec;
const uuid4 = require('uuid').v4;
const WebSocketServer = require('rpc-websockets').Server;

const asyncExec = (cmd) => {
  return new Promise((resolve, rejects) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        rejects(err, stderr);
      }
      resolve({ stdout, stderr });
    })
  });
}

function runCode({code, input, _id}) {
  server.event(_id);
  getResult({ code, input }, _id);
  return _id;
}

async function getResult({ code, input }, eventId) {
  return await compileCode(code, input, eventId)
}

const compileCode = async (code, input, eventId) => {
  if (!fs.existsSync('./codes')) {
    fs.mkdirSync('./codes');
  }

  const name = uuid4();
  fs.writeFileSync(`./codes/${name}.cpp`, code);

  server.emit(eventId, {
    type: "QUEUED",
    stdout: '',
    stderr: ''
  });

  try {
    await asyncExec(`g++ ./codes/${name}.cpp -o ${name}.out`);

    server.emit(eventId, {
      type: "RUNNING",
      stdout: '',
      stderr: ''
    })

    await asyncExec('ulimit -S -v 1');
    let { stdout, stderr } = await asyncExec(`echo "${input}" | ./${name}.out`);

    server.emit(eventId, {
      type: "SUCCESS",
      stdout: stdout,
      stderr: stderr
    })

  } catch (err) {
    server.emit(eventId, {
      type: "COMPILATION_FAILED",
      stdout: '',
      stderr: err
    })
  }
  fs.unlinkSync(`./codes/${name}.cpp`);
  fs.unlinkSync(`./${name}.out`);
}

function status() {
  return 'up';
}

const server = new WebSocketServer({
  port: process.env.PORT,
  host: '0.0.0.0'
});

server.register('runCode', runCode);
server.register('status', status);