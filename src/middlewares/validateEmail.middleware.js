import dns from 'dns';
import validator from 'validator';
import { promisify } from 'util';

import {asyncHandler} from '../utilities/asyncHandler.js';
import { ApiError } from '../utilities/apiError.js';

const resolveMx = promisify(dns.resolveMx);

const validateEmail = asyncHandler(async(req,res,next) => {
    const {email} = req.body;

    if(!email){
        throw new ApiError(400,'Email is required');
    }

    if(!validator.isEmail(email)){
        throw new ApiError(400,'Invalid email format');
    }

    const domain = email.split('@')[1];

    // try {
    //     const records = await resolveMx(domain);

    //     if (!records || records.length === 0) {
    //         throw new ApiError(400, 'Email domain is not valid');
    //     }
    // } catch (err) {
    //     throw new ApiError(400, 'Email domain could not be resolved');
    // }

    try {
    // 4️⃣ DNS MX lookup
        const records = await resolveMx(domain);

        // 5️⃣ Robust check for empty or invalid MX records
        if (!Array.isArray(records) || records.length === 0) {
            throw new ApiError(400, 'Email domain is not valid');
        }

    } catch (err) {
        // If DNS fails (domain doesn’t exist), throw an error
        throw new ApiError(400, 'Email domain could not be resolved');
    }

    next();

} );

export {validateEmail};