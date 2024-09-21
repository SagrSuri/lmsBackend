import { Schema, model } from 'mongoose'; // for structure define
import bcrypt from 'bcryptjs'; // for password encrytption
import jwt from 'jsonwebtoken'; // for cookie set
import crypto from 'crypto' // for reseting password

const userSchema = new Schema({
  fullName: {
    type: String,
    required: [true, "Name is Required"],
    minlength: [5, "Name must be at least 5 characters."],
    maxlength: [40, "Name should be less than 40 characters"],
    uppercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    unique: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
      "Please enter a valid email address"
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password should be at least 6 characters'],
  },
  avatar: {
    public_id: {
      type: String
    },
    secure_url: {
      type: String,
    }
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  },
  forgotPasswordToken: String,
  forgotPasswordExpiry: Date,
}, {
  timestamps: true,
});

// Middleware to hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Instance methods
userSchema.methods.generateJWTToken = function() {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role // Removed 'subscription' as it wasn't defined in the schema
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY
    }
  );
};

userSchema.methods.comparePassword = async function(plainTextPassword) {
  try {
    return await bcrypt.compare(plainTextPassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.forgotPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
  
  this.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 min from now

  return resetToken; // Return the plain token for use in the URL
};


const User = model('User', userSchema); // 'User' Model in database

export default User;
