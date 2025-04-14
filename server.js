import express, { json } from 'express';
import { config } from 'dotenv';
import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import { swaggerDocs } from './config/swagger.js';
import productRoutes from './routes/productRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

config(); // Load .env variables

connectDB();
const app = express();
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://your-frontend-domain.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(cors(corsOptions));
app.use(json());
app.use(cookieParser());

// Test Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);

// Swagger Docs
swaggerDocs(app);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs 📚`);
});
