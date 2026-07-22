import express from 'express';
import cors from 'cors';

import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import examRoutes from './routes/examRoutes.js';
import resultRoutes from './routes/resultRoutes.js';

import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

/* -------------------- Middleware -------------------- */

app.use(
  cors({
    origin: [
      process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      'https://online-exam-portal-pi.vercel.app'
    ],
    credentials: true
  })
);

app.use(express.json());

/* -------------------- Health Check -------------------- */

app.get('/', (req, res) => {
  res.send('Online Examination Portal Backend is running successfully 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy'
  });
});

/* -------------------- Routes -------------------- */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);

/* -------------------- Error Handling -------------------- */

app.use(notFound);
app.use(errorHandler);

/* -------------------- Server -------------------- */

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });
