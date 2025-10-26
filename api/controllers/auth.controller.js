import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../src/config/db.js";
import { sendEmail } from "../../utils/mailer.js";

// --- CONSTANTS ---
const JWT_SECRET = process.env.JWT_SECRET || 'c60bf1580bb67891df9e0909447071baf6720fb47670a6cca3c91258f1fb5c1f5061351ea4ae90bf574c67d1011d8f07a13f46dd62564d738b8877721a92c30a';
const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || '39b5bd77da9fd36aae33a70f676fdcd82d3d3f4d7cf64b0825250ab5d14e2382fc0ade2b3c0cbd8e56268b2c902cd3db2e049e8b8c7d3e6a03d5d3b3cea1a7be';

// --- SIGN UP ---
export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });
    res.status(201).json({ 
      message: 'User created successfully',
      userId: user.id 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// --- SIGN IN ---
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// --- SEND RESET LINK ---
export const sendResetLink = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Generic message to avoid revealing emails
    if (!user) return res.json({ message: "If the email is registered, a reset link will be sent." });
    const token = jwt.sign(
      { id: user.id },
      JWT_RESET_SECRET,
      { expiresIn: "15m" }
    );
    const link = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    await sendEmail(
      email,
      "Password Reset - Studio Perennis",
      `<p>Click below to reset your password:</p>
       <a href="${link}">${link}</a>
       <p>This link expires in 15 minutes.</p>`
    );
    res.json({ message: "If the email is registered, a reset link will be sent." });
  } catch (err) {
    res.status(500).json({ message: "Error sending reset link", error: err.message });
  }
};

// --- RESET PASSWORD ---
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, JWT_RESET_SECRET);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.id },
      data: { password: hashed },
    });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password", error: err.message });
  }
};
