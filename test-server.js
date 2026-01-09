import express from 'express';

const app = express();
app.get('/test', (req, res) => {
  res.json({ message: 'OK' });
});

app.listen(3001, () => {
  console.log('Test server on 3001');
});
