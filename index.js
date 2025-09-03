import dotenv from 'dotenv';
dotenv.config({
    path:'./.env'
});

import { connectDB } from './src/db/index.db.js';
import { app } from './app.js';

connectDB()
.then(()=>{
    const port = process.env.PORT || 4000;
    app.listen(port,()=>{
        console.log(`⚙️ Server is listening on port ${port}`);
    })
})
.catch((err)=>{
    console.log('❌ MongoDB Connection Error: ',err);
    process.exit(1);
})