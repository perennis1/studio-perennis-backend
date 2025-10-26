import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./api/routes/auth.routes.js";
import userRoutes from "./api/routes/user.routes.js";
import prisma from './src/config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const whitelist = ['http://localhost:3000', process.env.FRONTEND_URL || 'http://192.168.1.10:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) === -1) {
      return callback(new Error('CORS policy does not allow this origin'), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Test DB connection
prisma.$connect()
  .then(() => console.log('Successfully connected to PostgreSQL!'))
  .catch(err => console.error('Database connection error:', err));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
