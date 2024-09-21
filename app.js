import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import userRoutes from './routes/user.routes.js';
import errorMiddelware from './middlewares/error.middleware.js';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
}))
app.use(cookieParser())
app.use(morgan('dev'));

app.use('/lms' , (req ,res) => {
    return res.send("WECOME LMS PROJECT.")
})

app.use('/api/v1/user', userRoutes)

app.all('*' , (req, res) => {
    return res.status(404).send("OOPS! Page Not Found")
})

app.use(errorMiddelware)

export default app;