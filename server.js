import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// CORS: allow your frontend(s)
const whitelist = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // e.g., https://studio-perennis-frontend.onrender.com
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      cb(null, whitelist.includes(origin));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.send("Studio Perennis backend is live 🚀");
});

/**
 * SIGNUP
 * POST /api/auth/signup
 * body: { email, password, name? }
 */
app.post("/api/auth/signup", async (req, res) => {
  try {
    let { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    email = String(email).toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name || null },
    });

    return res.status(201).json({
      message: "User created successfully",
      userId: user.id,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error during signup" });
  }
});

/**
 * SIGNIN
 * POST /api/auth/signin
 * body: { email, password }
 */
app.post("/api/auth/signin", async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    email = String(email).toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

/**
 * Forgot password: send reset link
 * POST /api/auth/forgot-password
 * body: { email }
 */
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    email = String(email).toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    // Respond generically to avoid user enumeration
    if (!user) {
      return res.json({
        message: "If the email is registered, a reset link will be sent.",
      });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const base = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${base}/auth/reset-password?token=${token}`;

    console.log("Forgot request for:", email);
    console.log("Reset link:", resetLink);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Gmail address
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`,
    });

    console.log("Mail sent to:", email);

    return res.json({
      message: "If the email is registered, a reset link will be sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Reset password
 * POST /api/auth/reset-password
 * body: { token, newPassword }
 */
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
    );

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: payload.id },
      data: { password: hashed },
    });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

