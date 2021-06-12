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

function runCode() {
  return '1234';
}

async function getResult({ code, input }, call) {
  return await compileCode(code, input, call)
}

const compileCode = async (code, input, call) => {
  if (!fs.existsSync('./codes')) {
    fs.mkdirSync('./codes');
  }

  const name = uuid4();
  fs.writeFileSync(`./codes/${name}.cpp`, code);

  call.write({
    type: "QUEUED",
    stdout: '',
    stderr: ''
  })

  try {
    await asyncExec(`g++ ./codes/${name}.cpp -o ${name}.out`);

    call.write({
      type: "RUNNING",
      stdout: '',
      stderr: ''
    })

    await asyncExec('ulimit -S -v 1');
    let { stdout, stderr } = await asyncExec(`echo "${input}" | ./${name}.out`);

    call.write({
      type: "SUCCESS",
      stdout: stdout,
      stderr: stderr
    });

  } catch (err) {
    call.write({
      type: "COMPILATION_FAILED",
      stdout: '',
      stderr: err
    })
  }
  call.end();
  fs.unlinkSync(`./codes/${name}.cpp`);
  fs.unlinkSync(`./${name}.out`);
}

const server = new WebSocketServer({
  port: '8080',
  host: '0.0.0.0'
});

server.register('runCode', runCode);