require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));

// Database Connection and Server Initialization
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB(); // Wait for DB connection
        console.log("Database connected successfully");

        // Start server only after DB connection is successful
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to the database", error);
        process.exit(1); // Exit process with failure if DB connection fails
    }
};

startServer();
