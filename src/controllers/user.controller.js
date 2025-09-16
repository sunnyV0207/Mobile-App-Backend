import {ApiError} from "../utilities/apiError.js";
import {ApiResponse} from "../utilities/apiResponse.js";
import {asyncHandler} from "../utilities/asyncHandler.js";
import {User} from '../models/user.model.js'
import { OAuth2Client } from "google-auth-library";
import { transporter } from "../utilities/transporter.js";

// import axios from 'axios';
import crypto from 'crypto';
// import admin from 'firebase-admin';
// import fs from 'fs';
// import path from 'path';
// const serviceAccount = JSON.parse(
//     fs.readFileSync(path.resolve('./service-account.json'), 'utf8')
// );
// import twilio from "twilio";
// import Api from "twilio/lib/rest/Api.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// const otpVerificationClient = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),  // Add path to your service account
// });

const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return passwordRegex.test(password);
}

// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000);
// }

// async function sendOTP(phone, otp) {
//     console.log("inside sendotp function");
//   try {
//     const message = await otpVerificationClient.messages.create({
//       body: `Your OTP is ${otp}. It will expire in 5 minutes.`,
//       from: process.env.TWILIO_PHONE, // Twilio number
//       to: `+91${phone}`, // recipient number
//     });
//     console.log("Message SID:", message.sid);
//   } catch (error) {
//     console.error("Error sending OTP:", error);
//   }
// }

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

    // const otp = generateOTP();

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

    const verificationToken = crypto.randomBytes(32).toString("hex");
    registeredUser.verificationToken = verificationToken;
    await registeredUser.save();

    const verificationUrl = `https://mobile-app-backend-wf43.onrender.com/api/v1/user/verify-user?token=${verificationToken}&email=${email}`;

    const mailOptions = {
        from:'sunnyvermaverma2005@gmail.com',
        to:email,
        subject:"Verify your email",
        html: `
            <p>Hi ${name},</p>
            <p>Thank you for registering. Please verify your email by clicking the link below:</p>
            <a href="${verificationUrl}">Verify Email</a>
            <p>If you did not create an account, please ignore this email.</p>
        `
    };

    console.log("Sending mail");
    await transporter.sendMail(mailOptions);
    console.log("mail sent");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            'User registered successfully',
            {
                registeredUser
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

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "User verified Successfully"
        )
    );
})

// const verifyUser = asyncHandler(async(req,res,next)=>{
//     const {email,phone,otp} = req.body;

//     if(!otp || (!email && !phone)){
//         throw new ApiError(400,'Otp and email/phone is required');
//     }

//     const user = await User.findOne({$or:[{email},{phone}]});

//     if(!user){
//         throw new ApiError(401,'User do not exists');
//     }

//     let validOtp = false;

//     if (email && user.otp === otp && user.otpExpires > Date.now()) {
//       validOtp = true;
//       user.verified = true;
//       user.otp = undefined;
//       user.otpExpires = undefined;
//     } else if (phone && user.otp === otp && user.otpExpires > Date.now()) {
//       validOtp = true;
//       user.verified = true;
//       user.otp = undefined;
//       user.otpExpires = undefined;
//     }

//     if (!validOtp) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     await user.save();

//     res
//     .status(200)
//     .json(
//         new ApiResponse(
//             200,
//             'User verified Successfully'
//         )
//     )

// })

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
    user.verified = true;
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

// const googleAuth = asyncHandler( async (req,res,next) => {
//     const {idToken} = req.body;
//     // console.log(idToken);
//     if(!idToken){
//         throw new ApiError(401,"Google Authentication Failed? Missing Token");
//     }

//     const decodedToken = await admin.auth().verifyIdToken(idToken);
//     if(!decodedToken){
//         throw new ApiError(401,"Invalid IdToken? Try Again");
//     }

//     const {uid,email,name,phone} = decodedToken;

//     let user = await User.findOne({$or:[{email},{googleId:uid}]});
//     let created = false;
    
//     if(!user){
//         user = new User({
//             name,
//             email,
//             phone: phone || null,
//             googleId: uid
//         })
//         await user.save();
//         created = true;
//     }else if(!user.googleId){
//         user.googleId = uid;
//         await user.save();
//     }

//     const accessToken = user.generateAccessToken();
//     const refreshToken = user.generateRefreshToken();

//     user.refreshToken = refreshToken;
//     user.verified = true;
//     await user.save();

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(
//             created ? 201 : 200,
//             created ? 'User Registered Successfully!' : 'User Loggedin Successfully',
//             {
//                 user:{
//                     id:user._id,
//                     name:user.name,
//                     email:user.email,
//                     googleId:user.googleId
//                 },
//                 tokens:{
//                     accessToken,
//                     refreshToken
//                 }
//             }
//         )
//     )
// })

const loginUser = asyncHandler( async (req,res) => {

    const {email,password} = req.body;

    if(!email || !password){
        throw new ApiError(400,'Email or password is required');
    }

    const user = await User.findOne({email});

    if(!user){
        throw new ApiError(401,'Invalid email');
    }

    const isPasswordValid = validatePassword(password) && await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(400,"Wrong Password. Try again!");
    }
    
    if(!user.verified){
        throw new ApiError(401,'User is not verified kindly go to your email to verify user');
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
                    email: user.email || null,
                    phone: user.phone || null
                },
                tokens:{
                    accessToken,
                    refreshToken
                }
            }
        )
    )
} )

const checkAuth = asyncHandler(async(req,res,next)=>{
    const user = req.user;
    if(!user){
        throw new ApiError(400,"Something went wrong");
    };
    
    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Token verified",
            {
                user:{
                    id:user._id,
                    name:user.name,
                    email:user.email
                }
            }
        )
    )
})


export {registerUser,googleAuth,loginUser,verifyEmail,checkAuth};
