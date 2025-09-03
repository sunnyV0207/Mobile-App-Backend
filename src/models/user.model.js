import mongoose,{Model, Schema} from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema(
    {
        name:{
            type: String
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercaes: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
        },
        password:{
            type:String,
            minlength: 8
        },
        verified:{
            type:Boolean,
            default:false
        },
        verificationToken:{
            type:String
        },
        googleId:{
            type: String,
            unique:true,
            sparse:true
        },
        refreshToken:{
            type:String
        }
    },
    {
        timestamps:true
    }
);

userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password,10);
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            name: this.name,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
};

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};

export const User = mongoose.model('User',userSchema);