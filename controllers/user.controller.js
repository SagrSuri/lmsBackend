import User from "../models/user.model.js";
import AppError from "../utils/error.util.js";
import cloudinary from 'cloudinary'
import fs from 'fs/promises'
import sendEmail from "../utils/sendEmail.js";
import crypto from 'crypto'

const cookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: true,
};

// ************************ Register ***************************** //
const register = async (req, res, next) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return next(new AppError("All fields are required", 400));
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError("Email Already Exists", 400));
  }

  const user = await User.create({
    fullName,
    email,
    password,
    avatar: {
      public_id: email,
      secure_url:
        "https://res.cloudinary.com/sagarsuri/image/upload/f_auto,q_auto/sagarsuri",
    },
  });

  if (!user) {
    return next(
      new AppError("User Registration Failed , Please try again", 400)
    );
  }

  // UPLODING IMAGE FILE IN CLOUDINARY +++++++// configration set on server.js//
  // ++++++++++++++File comming from multer logic that is req.file +++++++++//
  if(req.file){
    console.log(`File Details >>>>>>>>>>>>>`, JSON.stringify(req.file))
    try {
        const result = await cloudinary.v2.uploader.upload(req.file.path , {
            folder: 'lmsBackend',
            width: 250,
            height: 250,
            gravity: 'faces',
            crop: 'fill'
        })

        if(result){
            user.avatar.public_id = result.public_id,
            user.avatar.secure_url = result.secure_url

            // Remove File from server
            fs.rm(`uploads/${req.file.filename}`)
        }
    } catch (e) {
        return next(new AppError( e || "File Not Uploaded Please try again"))
    }
  }

   // Ensure avatar updates are saved
  await user.save();

  // Exclude the password in response for security
  user.password = undefined;

  // Generate JWT token for the user
  const token = await user.generateJWTToken();

  // Set the cookie with token
  res.cookie("token", token, cookieOptions);

  // Send the complete user profile details (without password) in the response
  res.status(201).json({
    success: true,
    message: "User Registration Successfull.",
    user, // Full profile details returned
  });
};


// ************************ LOGIN ***************************** //
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new AppError("All Fields are Required", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Email and password do not match", 400));
    }

    const token = await user.generateJWTToken();
    user.password = undefined;

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "User Logged in Successfully",
    });
  } catch (e) {
    return next(new AppError(e.message, 500));
  }
};


// ********************LOGOUT ***************************** //
const logout = (req, res) => {
  res.cookie("token", null, {
    secure: true,
    maxAge: 0,
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "User Logged Out Successfully",
  });
};


// ******************** GET PROFILE ***************************** //
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      user,
    });
  } catch (error) {
    return next(new AppError("Failed to fetch profile or user details", 500));
  }
};

// *********************** ForgotPassword ***********************//

// import { sendEmail } from your utils

const forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError("Email is Required", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new AppError("User Not Registered.", 500));
    }

    const resetToken = await user.generatePasswordResetToken();
    await user.save();

    const resetPasswordURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    console.log(resetPasswordURL);

    const subject = 'Reset Password';
    const message = `You can reset your password by clicking <a href='${resetPasswordURL}' target='_blank'> Reset Your Password. </a> 
                     \n If the above link does not work for some reason, copy and paste this link in a new tab: ${resetPasswordURL}. 
                     \n If you have not requested this, kindly ignore.`;

    try {
        await sendEmail(email, subject, message);

        res.status(200).json({
            success: true,
            message: `Reset Password Token has been sent to ${email} successfully.`,
        });
    } catch (e) {
        user.forgotPasswordExpiry = undefined;
        user.forgotPasswordToken = undefined;

        await user.save();
        return next(new AppError(e.message, 500));
    }
};

// **************************** Reset Passwrod *****************************//

const resetPassword = async (req, res, next) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  if (!password) {
    return next(new AppError("Password is required", 400));
  }

  const forgotPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log("Hashed token:", forgotPasswordToken);

  const user = await User.findOne({
    forgotPasswordToken,
    forgotPasswordExpiry: { $gt: Date.now() }
  });

  if (!user) {
    console.log("Invalid or expired token");
    return next(new AppError("Token is Invalid or Expired, Please Try Again", 400));
  }

  user.password = password;          
  user.forgotPasswordToken = undefined; 
  user.forgotPasswordExpiry = undefined; 

  await user.save();

  res.status(200).json({
    success: true,
    message: "Your Password Changed Successfully"
  });
};




export { register, login, logout, getProfile ,forgotPassword, resetPassword };
