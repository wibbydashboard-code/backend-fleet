import express from 'express';
import { getProviders } from './repository.js';

const app = express();
app.use(express.json());

app.get('/api/providers', async (req, res) => {
  console.log('GET /api/providers called');
  try {
    const providers = await getProviders();
    res.json({ ok: true, data: providers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
});
