import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import taskRouter from './src/api/routes/task';

const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/task', taskRouter);

app.get('/', (req, res) => {
    res.send('Hello, World2!');
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}!`);
});
