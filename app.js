import express from 'express';
import cors from 'cors'

const app = express();

app.use(cors({
  origin:'*',
  credentials:true
}))
app.use(express.json());
app.use(express.static('public'));


import userRoutes from './src/routes/user.route.js';
app.use('/api/v1/user',userRoutes);

app.use((err, req, res, next) => {
  console.error("Error middleware caught:", err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Something went wrong",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

export {app};