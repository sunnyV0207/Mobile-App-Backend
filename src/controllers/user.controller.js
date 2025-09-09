import {ApiError} from "../utilities/apiError.js";
import {ApiResponse} from "../utilities/apiResponse.js";
import {asyncHandler} from "../utilities/asyncHandler.js";
import {User} from '../models/user.model.js'
import { OAuth2Client } from "google-auth-library";
import { transporter } from "../utilities/transporter.js";

// import axios from 'axios';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return passwordRegex.test(password);
}

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
}

const registerUser = asyncHandler( async (req,res) => {
    const {name,email,phone,password,cnfPassword} = req.body;

    if(!name || !email || !phone || !password || !cnfPassword){ 
        throw new ApiError(400,'All Fields are Required');
    }

    const alreadyUsedEmailorPhone = await User.findOne({$or:[{email},{phone}]});

    if(alreadyUsedEmailorPhone){
        throw new ApiError(409,'Email or phone is already in use. Try other one!!')
    }

    if(!validatePassword(password)){
        throw new ApiError(400,'❌ Password does not meet requirements');
    }

    if(password !== cnfPassword){
        throw new ApiError(401,'❌ Password does not match the confirm password');
    }

    const otp = generateOTP();

    const user = await User.create({
        name,
        email,
        phone,
        password,
        verified:false
    });

    const registeredUser = await User.findById(user._id).select("-password -refreshToken");

    if(!registeredUser){
        throw new ApiError(500,"User can't registered");
    }

    // const accessToken = registeredUser.generateAccessToken();
    // const refreshToken = registeredUser.generateRefreshToken();

    // registeredUser.refreshToken = refreshToken;
    // await registeredUser.save();

    // const verificationUrl = `https://mobile-app-backend-wf43.onrender.com/api/v1/user/verify-email?token=${verificationToken}&email=${email}`;

    // const mailOptions = {
    //     from:'sunnyvermaverma2005@gmail.com',
    //     to:email,
    //     subject:"Verify your email",
    //     html: `
    //         <p>Hi ${name},</p>
    //         <p>Thank you for registering. Please verify your email by clicking the link below:</p>
    //         <a href="${verificationUrl}">Verify Email</a>
    //         <p>If you did not create an account, please ignore this email.</p>
    //     `
    // };

    // await transporter.sendMail(mailOptions);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            'User registered successfully',
            {
                registeredUser,
                // tokens:{
                //     accessToken,
                //     refreshToken
                // }
            }
        )
    )

} );

const verifyEmail = asyncHandler(async(req,res,next)=>{
    const { token, email } = req.query;

    const user = await User.findOne({ email, verificationToken: token });
    if (!user) throw new ApiError(400, 'Invalid or expired token');

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully!' });
})

const googleAuth = asyncHandler( async (req,res) => {

    // This code is addible in web apps
    // const {code} = req.body;
    // console.log(code);

    // if(!code){
    //     throw new ApiError(400,'Authorization code is missing!');
    // }

    // const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", null, {
    //     params: {
    //     code,
    //     client_id: process.env.GOOGLE_CLIENT_ID,
    //     client_secret: process.env.GOOGLE_CLIENT_SECRET,
    //     redirect_uri: "postmessage", // 'postmessage' for one-time code from JS frontend
    //     grant_type: "authorization_code"
    //     }
    // });

    // const {id_token} = tokenResponse?.data;

    // if(!id_token){
    //     throw new ApiError(400,'Google Authentication Failed! Missing Token');
    // }

    const {idToken} = req.body;

    let payload;

    try {
        const ticket = await client.verifyIdToken({
            // idToken:id_token,
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    } catch (error) {
        throw new ApiError(401,'Invalid google token');
    }

    const {sub: googleId,email,name} = payload;

    if(!googleId || !email){
        throw new ApiError(400,'Google Aunthentication Failed!');
    }

    let user = await User.findOne({$or:[{googleId},{email}]});
    let created = false;

    if(!user){
        user = await User.create({
            googleId,
            email,
            name: name || email.split("@")[0]
        });
        created = true;
    }else if(!user.googleId){
        user.googleId = googleId;
        await user.save();
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return res
    .status(200)
    .json(
        new ApiResponse(
            created ? 201 : 200,
            created ? 'User Registered Successfully!' : 'User Loggedin Successfully',
            {
                user:{
                    id:user._id,
                    name:user.name,
                    email:user.email,
                    googleId:user.googleId
                },
                tokens:{
                    accessToken,
                    refreshToken
                }
            }
        )
    )

} )

const loginUser = asyncHandler( async (req,res) => {

    const {email,password} = req.body;

    if(!email || !password){
        throw new ApiError(400,'All fields are required');
    }

    const user = await User.findOne({email});
    if(!user || !user.isPasswordCorrect(password)){
        throw new ApiError(401,'Invalid email or password');
    }

    if(!user.verified){
        throw new ApiError(401,"User must be verified. Go to your email to verify user");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            'User loggedin Successfully!!',
            {
                user:{
                    id: user._id,
                    name: user.name,
                    email: user.email
                },
                tokens:{
                    accessToken,
                    refreshToken
                }
            }
        )
    )
} )

export {registerUser,googleAuth,loginUser,verifyEmail};