import User from "../models/user.model.js";
import AppError from "../utils/error.util.js";

const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: true
}

const register = async (req , res , next) => {
    const {fullName , email , password} = req.body;

     if(!fullName || !email || !password){
        return next(new AppError("All fields are required", 400))
     }

     const userExists = await User.findOne({email})
     if(userExists){
        return next(new AppError("Email Already Exists", 400))
     }

     const user = await User.create({
         fullName,
         email,
         password,
         avatar:{
            public_id: email,
            secure_url: 'https://res.cloudinary.com/sagarsuri/image/upload/f_auto,q_auto/sagarsuri'
         }
     })

     if(!user){
        return next(new AppError('User Registration Failed , Please try again', 400))
     }

     // TODO File Upload
     await user.save();
     
     user.password = undefined;

     const token = await user.generateJWTToken()

     res.cookie('token', token , cookieOptions)

     res.status(201).json({
        success: true,
        message: "User Registration Successfull."
     })

}
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new AppError("All Fields are Required", 400));
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return next(new AppError("Email and password do not match", 400));
        }

        const token = await user.generateJWTToken();
        user.password = undefined;

        res.cookie('token', token, cookieOptions);

        res.status(200).json({
            success: true,
            message: "User Logged in Successfully"
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};

const logout = (req , res) => {

    res.cookie('token' , null , {
        secure: true,
        maxAge: 0 ,
        httpOnly: true,
    })

    res.status(200).json({
        success: true,
        message: "User Logged Out Successfully"
    })

}
const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User details fetched successfully",
            user
        });
    } catch (error) {
        return next(new AppError("Failed to fetch profile or user details", 500));
    }
};

export {
    register,
    login,
    logout,
    getProfile
}