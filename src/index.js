// const express = require('express');
import express from 'express';
const app = express();
const PORT = 8000;

// Middleware to parse JSON
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.send("Hello From Express Server!" );
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});