const fs = require('fs');
const exec = require('child_process').exec;
const uuid4 = require('uuid').v4;
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = __dirname + '/protos/worker.proto';

const asyncExec = (cmd) => {
  return new Promise((resolve, rejects) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        rejects(err, stderr);
      }
      resolve({ stdout, stderr });
    })
  })
}

var packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const protoDesciptor = grpc.loadPackageDefinition(packageDefinition);

const worker = protoDesciptor.worker;
const Server = new grpc.Server();

function runCode(call) {
  getResult(call.request, call);
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

Server.addService(worker.Worker.service, {
  runCode: runCode
});

let credentials = grpc.ServerCredentials.createSsl(
	null,
  [{
		cert_chain: fs.readFileSync('./tls/tls.crt'),
		private_key: fs.readFileSync('./tls/tls.key'),
	}],
  true
);

Server.bindAsync('0.0.0.0:'+process.env.PORT, credentials, () => {
  Server.start();
});
