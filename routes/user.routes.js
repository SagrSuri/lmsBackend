import {Router} from 'express'
import { changePassword, deleteUser, forgotPassword, getProfile, login, logout, register, requestEmailChange, resetPassword, updateUser, verifyEmail, verifyNewEmail } from '../controllers/user.controller.js';
import { isLoggedIn } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/multer.middleware.js';

const userRoutes = Router();

userRoutes.post('/register' , upload.single('avatar') , register)
userRoutes.post('/login' , login)
userRoutes.get('/logout' , logout)
userRoutes.get('/me' , isLoggedIn, getProfile)
userRoutes.post('/reset-password', forgotPassword)
userRoutes.post('/reset-password/:resetToken' , resetPassword)
userRoutes.post('/change-password', isLoggedIn , changePassword)
userRoutes.put('/update', isLoggedIn, upload.single('avatar'), updateUser )
userRoutes.delete('/delete-account', isLoggedIn, deleteUser)
userRoutes.get('/verify-email/:token', verifyEmail); 

// **New routes for email change**
userRoutes.post('/change-email', isLoggedIn, requestEmailChange); // Route to request email change
userRoutes.get('/verify-new-email/:token', verifyNewEmail); // Route to verify the new email

export default userRoutes;