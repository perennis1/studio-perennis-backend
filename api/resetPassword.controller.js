export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res.status(400).json({ message: "Token and new password are required" });

    // Verify token
    const decoded = jwt.verify(token, JWT_RESET_SECRET);
    const userId = decoded.id;

    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Hash and update new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Optional: invalidate all old tokens by changing a version field or similar later

    res.status(200).json({ message: "Password reset successful. Please log in again." });
  } catch (err) {
    console.error("Error resetting password:", err);
    if (err.name === "TokenExpiredError")
      return res.status(400).json({ message: "Reset link has expired. Please request again." });
    res.status(400).json({ message: "Invalid or expired token" });
  }
};
