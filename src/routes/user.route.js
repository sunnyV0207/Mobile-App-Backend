import { Router } from "express";
import { validateEmail } from "../middlewares/validateEmail.middleware.js";
import {registerUser,googleAuth,loginUser,verifyUser} from '../controllers/user.controller.js'

const router = Router();
router.route('/home').get((req,res)=>{
    res.send("Welcome");
})
router.route('/register').post(validateEmail ,registerUser);
router.route('/google').post(googleAuth);
router.route('/login').post(loginUser);
router.route('/verify-user').post(verifyUser);

export default router;