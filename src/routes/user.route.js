import { Router } from "express";
import { validateEmail } from "../middlewares/validateEmail.middleware.js";
import {verifyJwt} from "..//middlewares/auth.middleware.js";
import {registerUser,googleAuth,loginUser,verifyEmail,checkAuth} from '../controllers/user.controller.js'

const router = Router();
router.route('/home').get((req,res)=>{
    res.send("Welcome");
})
router.route('/register').post(validateEmail ,registerUser);
router.route('/google').post(googleAuth);
router.route('/login').post(loginUser);
router.route('/verify-user').get(verifyEmail);
router.route('/check-auth').post(verifyJwt,checkAuth);


export default router;
