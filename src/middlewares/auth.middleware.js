import { User } from "../models/user.model.js";
import { ApiError } from "../utilities/apiError.js";
import { asyncHandler } from "../utilities/asyncHandler.js";
import jwt  from "jsonwebtoken";

const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return next(new ApiError(401, "Access Token missing"));
        }

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return next(new ApiError(401, "Access Token expired"));
            }
            return next(new ApiError(401, "Invalid Access Token"));
        }

        const user = await User.findById(decodedToken._id);

        if (!user) {
            return next(new ApiError(403, "User not found"));
        }

        req.user = user;
        next();
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
});

export {verifyJwt};
