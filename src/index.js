import express from 'express';
const app = express()
const Port = 8000

app.use(express.json());

app.get('/', (req, res) => {
    res.send("Server running");
});

app.listen(3000, () => {
    console.log(`Server started on http://localhost:${Port}`);
});
