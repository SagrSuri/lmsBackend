import AppError from "../utils/error.util.js";
import jwt from 'jsonwebtoken';

const isLoggedIn = async (req, res, next) => {
    try {
        const { token } = req.cookies;

        if (!token) {
            return next(new AppError("Unauthenticated, please login", 401));
        }

        // Verify token
        const userDetails = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user details to request object
        req.user = userDetails;

        // Proceed to next middleware or route handler
        next();
    } catch (error) {
        // Handle invalid token or other errors
        return next(new AppError("Invalid token or session expired", 401));
    }
};

export { isLoggedIn };
