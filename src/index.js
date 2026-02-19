import express from 'express';
import { matchRouter } from './routes/matches.js';
const app = express()
const Port = 8000

app.use(express.json());

app.get('/', (req, res) => {
    res.send("Server running");
});

app.use('/matches', matchRouter)

app.listen(8000, () => {
    console.log(`Server started on http://localhost:${Port}`);
});
