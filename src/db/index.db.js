import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected Successfully!!');
    } catch (error) {
        console.log('❌ MongoDB Connection error: ',error);
        process.exit(1);
    }
}

export {connectDB};