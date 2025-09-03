import { Router } from "express";
import { validateEmail } from "../middlewares/validateEmail.middleware.js";
import {registerUser,googleAuth,loginUser,verifyEmail} from '../controllers/user.controller.js'

const router = Router();
router.route('/register').post(validateEmail ,registerUser);
router.route('/google').post(googleAuth);
router.route('/login').post(loginUser);
router.route('/verify-email').get(verifyEmail);

export default router;