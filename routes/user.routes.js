import {Router} from 'express'
import { getProfile, login, logout, register } from '../controllers/user.controller.js';
import { isLoggedIn } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/multer.middleware.js';

const userRoutes = Router();

userRoutes.post('/register' , upload.single('avatar') , register)
userRoutes.post('/login' , login)
userRoutes.get('/logout' , logout)
userRoutes.get('/me' , isLoggedIn, getProfile)



export default userRoutes;