import express from "express";
import {
  signup,
  signin,
  sendResetLink,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

// Existing, stable endpoints
router.post("/signup", signup);
router.post("/signin", signin);

// New password reset endpoints
router.post("/forgot-password", sendResetLink);
router.post("/reset-password", resetPassword);

export default router;
