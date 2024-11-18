const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Helper function to send OTP email
const sendOtpEmail = async (user, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your OTP Verification Code",
        text: `Your OTP code is ${otp}`,
    };
    await transporter.sendMail(mailOptions);
};

// Signup
exports.signup = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = crypto.randomInt(100000, 999999).toString();

        const user = new User({
            username,
            email,
            password: hashedPassword,
            otp,
            otpExpiresAt: Date.now() + 10 * 60 * 1000,
        });

        await user.save();
        await sendOtpEmail(user, otp);

        res.status(201).json({ message: "Signup successful! Please check your email for the OTP." });
    } catch (error) {
        res.status(500).json({ message: "Signup failed. Please try again.", error });
    }
};

// OTP Verification
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        console.log("Received email:", email);
        console.log("Received OTP:", otp);

        const user = await User.findOne({ email });
        if (!user) {
            console.error("User not found for email:", email);
            return res.status(404).json({ message: "User not found." });
        }

        console.log("Stored OTP:", user.otp);
        console.log("OTP Expiry:", user.otpExpiresAt);

        if (user.otp !== otp || user.otpExpiresAt < Date.now()) {
            console.error("Invalid or expired OTP");
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        res.status(200).json({ message: "OTP verified successfully! You can now log in." });
    } catch (error) {
        console.error("Error during OTP verification:", error);
        res.status(500).json({ message: "OTP verification failed. Please try again.", error });
    }
};
// exports.verifyOtp = async (req, res) => {
//     const { email, otp } = req.body;
//     try {
//         const user = await User.findOne({ email });
//         if (!user) return res.status(404).json({ message: "User not found." });

//         if (user.otp !== otp || user.otpExpiresAt < Date.now()) {
//             return res.status(400).json({ message: "Invalid or expired OTP." });
//         }

//         user.isVerified = true;
//         user.otp = undefined;
//         user.otpExpiresAt = undefined;
//         await user.save();

//         res.status(200).json({ message: "OTP verified successfully! You can now log in." });
//     } catch (error) {
//         res.status(500).json({ message: "OTP verification failed. Please try again.", error });
//     }
// };

// Resend OTP
exports.resendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = crypto.randomInt(100000, 999999).toString();
        user.otp = otp;
        user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
        await user.save();

        await sendOtpEmail(user, otp);
        res.status(200).json({ message: "OTP resent. Check your email." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: "Account not verified. Please verify your email." });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(200).json({ message: "Login successful!", token });
    } catch (error) {
        res.status(500).json({ message: "Login failed. Please try again.", error });
    }
};