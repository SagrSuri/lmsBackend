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

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError("Email Already Exists", 400));
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    password,
    avatar: {
      public_id: email,
      secure_url: "https://res.cloudinary.com/sagarsuri/image/upload/f_auto,q_auto/sagarsuri",
    },
  });

  if (!user) {
    return next(new AppError("User Registration Failed, Please try again", 400));
  }

  // **Email Verification Token Generation**
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false }); // Save user with token

  const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  const subject = 'Email Verification';
  const message = `Please verify your email by clicking on this link - <a href='${verificationURL}'> Verify Email </a>`;

  // Send email verification message
  await sendEmail(user.email, subject, message);

  // **Uploading Avatar to Cloudinary if Image Exists**
  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: 'lmsBackend',
        width: 250,
        height: 250,
        gravity: 'faces',
        crop: 'fill'
      });

      if (result) {
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;

        // Remove File from server after upload
        await fs.rm(`uploads/${req.file.filename}`);
      }
    } catch (e) {
      return next(new AppError(e.message || "File Not Uploaded. Please try again"));
    }
  }

  // Ensure avatar is saved if modified
  await user.save();

  // **Exclude password in response**
  user.password = undefined;

  // **Generate JWT token for the user**
  const token = await user.generateJWTToken();

  // **Set the cookie with JWT token**
  res.cookie("token", token, cookieOptions);

  // **Send user data in response**
  res.status(201).json({
    success: true,
    message: "User Registration Successful. Please verify your email.",
    user,
  });
};

// ********************EMAIL VERIFICATION ****************//
const verifyEmail = async (req, res, next) => {
  const { token } = req.params;

  // Hash the received token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Debug logs
  // console.log("Received plain token:", token);
  // console.log("Hashed token from request:", hashedToken);

  // Find the user with the hashed token and check for verification status
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerified: false,
    emailVerificationExpires: { $gt: Date.now() }, // Ensure the token is still valid
  });

  // Log the user's email verification data for debugging
  // console.log("User emailVerificationToken in DB (hashed):", user ? user.emailVerificationToken : 'No user found');
  // console.log("User emailVerificationExpires in DB:", user ? user.emailVerificationExpires : 'No user found');

  if (!user) {
    // console.log("No user found with hashed token:", hashedToken);
    return next(new AppError('Invalid or expired verification token', 400));
  }

  // Mark email as verified and clear verification data
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  // Log success message
  // console.log("Email verified successfully for user:", user.email);

  // Respond with success message
  res.status(200).json({
    success: true,
    message: 'Email verified successfully!',
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

    // console.log(resetPasswordURL);

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

    // ******************CONSOLE DESABLE MESSAGE*************//
  // console.log("Hashed token:", forgotPasswordToken);

  const user = await User.findOne({
    forgotPasswordToken,
    forgotPasswordExpiry: { $gt: Date.now() }
  });

  if (!user) {

    // console.log("Invalid or expired token");
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

// **************************** Change Password ******************************//

const changePassword = async (req, res, next) => {
  // console.log(req.body); // Log the request body to check if oldPassword and newPassword are present

  // Destructure oldPassword and newPassword from the request body
  const { oldPassword, newPassword } = req.body;

  // Validate input
  if (!oldPassword || !newPassword) {
      return next(new AppError('Both old password and new password fields are required', 400));
  }

  // Fetch the user from the database
  const user = await User.findById(req.user.id).select('+password'); 

  // Check if the user exists
  if (!user) {
      return next(new AppError('User does not exist', 404));
  }

  // Validate the old password
  const isPasswordValid = await user.comparePassword(oldPassword);
  if (!isPasswordValid) {
      return next(new AppError('Invalid old password', 401));
  }

  // Update the password
  user.password = newPassword;

  try {
      await user.save(); // Save the user with the new password
      user.password = undefined; // Remove the password from the user object for security

      // Respond with success message
      res.status(200).json({
          success: true,
          message: "Password changed successfully",
      });
  } catch (error) {
      // Handle potential save errors
      // console.error("Error saving new password:", error);
      return next(new AppError('Failed to change password, please try again', 500));
  }
};

// *************************Update User******************************//

const updateUser = async (req, res, next) => {
  // ******************CONSOLE MESSAGE desabled*************//
  // console.log("Request reached updateUser controller");

  try {
    const { fullName } = req.body;
    
    // console.log("Full name from body:", fullName);

    const id = req.user?.id; // Safely check if req.user exists
    if (!id) {
      // console.log("No user ID found");
      return next(new AppError("User not authenticated", 401));
    }
    // console.log("Authenticated user ID:", id);

    const user = await User.findById(id);
    if (!user) {
      // console.log("User does not exist");
      return next(new AppError("User does not exist", 400));
    }

    // Update fullName if provided
    if (fullName) {
      user.fullName = fullName;
    }

    // Check if an avatar file was uploaded
    if (req.file) {
      // console.log("File found, proceeding to upload avatar");

      // Remove old avatar from Cloudinary
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lmsBackend",
        width: 250,
        height: 250,
        gravity: "faces",
        crop: "fill",
      });

      if (result) {
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;
        // console.log("Avatar updated successfully");

        // Remove uploaded file from server
        await fs.rm(`uploads/${req.file.filename}`);
        // console.log("Uploaded file removed from server");
      }
    }

    // Save updated user details
    await user.save();
    // console.log("User details updated successfully");

    // Respond with success
    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      user,
    });
  } catch (error) {
    // console.error("Error updating user:", error);
    return next(new AppError(error.message || "Something went wrong.", 500));
  }
};


// **************************** DELETE USER ******************************//
const deleteUser = async (req, res, next) => {
  const { confirm, email } = req.body;

  if (!confirm || confirm !== "DELETE_ACCOUNT") {
    return next(new AppError("Confirmation is required to delete your account", 400));
  }

  // Check if the email matches the authenticated user's email
  const userId = req.user.id; // Get the authenticated user's ID
  const user = await User.findById(userId);
  if (!user || user.email !== email) {
    return next(new AppError("Email does not match your account", 400));
  }

  try {
    // Remove the user's avatar from Cloudinary if it exists
    if (user.avatar.public_id) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    }

    // Delete the user from the database
    await User.findByIdAndDelete(userId);

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "User account deleted successfully",
    });
  } catch (error) {
    // console.error("Error deleting user:", error);
    return next(new AppError("Failed to delete user, please try again", 500));
  }
};

// ++++++++++++++++REQUEST EMAIL CHANGE**************//
const requestEmailChange = async (req, res, next) => {
  const { newEmail } = req.body;

  // *********************CONSOLE DEBUG STOP**********************
  // console.log("Request to change email received for new email:", newEmail);

  if (!newEmail) {
    return next(new AppError("New email is required", 400));
  }

  const existingUser = await User.findOne({ email: newEmail });
  if (existingUser) {
    // console.log("New email already exists in the database");
    return next(new AppError("Email already exists", 400));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    // console.log("User not found");
    return next(new AppError("User not found", 404));
  }

  // Generate email verification token for the new email
  const emailVerificationToken = user.createNewEmailVerificationToken(); // Updated method call
  user.newEmail = newEmail; // Temporarily store the new email
  await user.save({ validateBeforeSave: false });

  const verificationURL = `${process.env.FRONTEND_URL}/verify-new-email/${emailVerificationToken}`;
  // console.log("Verification URL:", verificationURL);

  const subject = 'Verify New Email Address';
  const message = `Please verify your new email by clicking on this link: <a href='${verificationURL}'> Verify New Email </a>`;
  
  await sendEmail(newEmail, subject, message);
  // console.log("Verification email sent to:", newEmail);

  res.status(200).json({
    success: true,
    message: "Verification email sent to new address.",
  });
};

// ++++++++++++++++VERIFY NEW EMAIL+++++++++++++++++++++++++//
const verifyNewEmail = async (req, res, next) => {
  const { token } = req.params;
  // console.log("Received token:", token);

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  // console.log("Hashed token:", hashedToken);

  const user = await User.findOne({
    newEmailVerificationToken: hashedToken, // Check against newEmailVerificationToken
    newEmailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    // console.log("No user found with the hashed token or token has expired");
    return next(new AppError('Invalid or expired verification token', 400));
  }

  // Update user email and clear verification data
  user.email = user.newEmail; 
  user.emailVerified = true; 
  user.newEmailVerificationToken = undefined; 
  user.newEmailVerificationExpires = undefined; 
  user.newEmail = undefined; 
  await user.save();

  // console.log("New email verified successfully for user:", user.email);
  res.status(200).json({
    success: true,
    message: 'New email verified successfully!',
  });
};


export { register, login, logout, getProfile ,forgotPassword, resetPassword , changePassword , updateUser , deleteUser , verifyEmail , requestEmailChange , verifyNewEmail};
