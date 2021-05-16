import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import taskRouter from './routes/task';
import axios from 'axios';

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/task', taskRouter);

app.get('/', (req, res) => {
  res.send('Hello, World2!');
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}!`);
  axios.get("http://sheltered-wave-36478.herokuapp.com/").then(res => console.log(res.status));
});