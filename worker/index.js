const http = require('http');
var request = require('request');
const fs = require('fs');
const { exec } = require('child_process');

http.createServer(function (req, res) {
  res.write('Hello World!'); //write a response to the client
  res.end(); //end the response
}).listen(process.env.PORT || 5000); //the server object listens on port 8080

const API = 'http://server:4000/task';

function run() {
    http.get(API + '/assign', (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
        resp.on('end', async () => {
            if (!fs.existsSync('./codes')) {
                fs.mkdirSync('./codes');
            }
            if (data == "{}") {
                return;
            }
            console.log("received");
            data = JSON.parse(data);
            
            fs.writeFileSync('./codes/'+data._id+'.cpp', data.code, (err) => {
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });

            
            await exec('g++ ' + './codes/' + data._id + '.cpp', async (err, stdout, stderr) => {
                if (err) {
                    data.err = stderr;
                    console.log('g++ failed with: ' + err);
                    submitTask(data);
                    return;
                }
                exec('ulimit -S -v 1', (err, stdout, stderr) => {
                    if (err) {
                        console.log('Error: ulimit: ' + err);
                        return;
                    }
                    console.log("setting limit to process");
                    console.log(`ulimit: stdout: ${stdout}`);
                    console.log(`ulimit: stderr: ${stderr}`);
                    console.log("process runnig");
                    var process = exec('echo "' + data.input + '" | ./a.out', { timeout: 10000 },(err, stdout, stderr) => {
                        if (err) {
                            console.log("Error while executing ./a.out");
                            submitTask(data);
                            return;
                        }
                        console.log(`stdout: \n${stdout}`);
                        console.log(`stderr: ${stderr}`);
                        
                        exec('ulimit -S -v unlimited', (err, stdout, stderr) => {
                            if (err) {
                                console.log('Error: ulimit: ' + err);
                                return;
                            }
                            console.log('resetting limit to process');
                            console.log(`ulimit: stdout: ${stdout}`);
                            console.log(`ulimit: stderr: ${stderr}`);
                        });

                        if (stdout)
                            data.stdout = stdout;
                        if (stderr)
                            data.stderr = stderr;
                        submitTask(data);
                    });
                });
            });

        });
    }).on('error', (err) => {
        console.log('Error: ' + err.message);
    });
    setTimeout(run, 1000);
}
run();
function submitTask(data) {
    request.post({
        url: API + "/submit",
        method: "POST",
        json: true,
        body: {
            email: data.email,
            code: data.code,
            input: data.input,
            err: data.err,
            stdout: data.stdout,
            stderr: data.stderr,
            status: data.status,
            _id: data._id
        } 
    },
    function (err, Response, body) {
        if (!err) {
            console.log(body);
        }
    });
}