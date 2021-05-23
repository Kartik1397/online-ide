const PROTO_PATH = __dirname + '/../protos/worker.proto';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);

const protoDesciptor = grpc.loadPackageDefinition(packageDefinition);

console.log(protoDesciptor);

export default protoDesciptor;