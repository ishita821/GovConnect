const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });
const User = require("./models/User");
const application = require("./models/application");
const service = require("./models/service");

const app = express();
const PORT = 3000;

// ==================== MULTER ====================

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });

// ==================== SESSION ====================

app.use(session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false
}));

// ==================== MONGODB ====================

mongoose.connect("mongodb://127.0.0.1:27017/govconnect")
    .then(() => {
        console.log("MongoDB Connected");
    })
    .catch((err) => {
        console.log("MongoDB Error:", err);
    });

// ==================== MIDDLEWARE ====================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// Make uploaded documents accessible
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==================== HOME ====================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================== LOGIN PAGE ====================

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ==================== REGISTER ====================

app.post("/register", async (req, res) => {

    console.log(req.body);

    try {

        // Check passwords
        if (req.body.password !== req.body.confirmpassword) {
            return res.send("Passwords do not match");
        }

        // Check if email already exists
        const existingUser = await User.findOne({
            email: req.body.email
        });

        if (existingUser) {
            return res.send("Email already registered");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
            req.body.password,
            10
        );

        // Create user
        const user = new User({
            fullname: req.body.fullname,
            mobile: req.body.mobile,
            email: req.body.email,
            password: hashedPassword
        });

        await user.save();

        res.send("Registration Successful! Please login.");

    } catch (err) {

        console.log(err);
        res.send("Error while registering.");

    }
});

// ==================== LOGIN ====================

app.post("/login", async (req, res) => {

    try {

        // Find user
        const user = await User.findOne({
            email: req.body.email
        });

        if (!user) {
            return res.send("User not found");
        }

        // Check password
        const isMatch = await bcrypt.compare(
            req.body.password,
            user.password
        );

        if (!isMatch) {
            return res.send("Incorrect password");
        }

        // Save user in session
        req.session.user = {
            id: user._id,
            fullname: user.fullname,
            email: user.email,
            mobile: user.mobile
        };

        res.redirect("/dashboard");

    } catch (err) {

        console.log(err);
        res.send("Error during login");

    }
});

// ==================== DASHBOARD ====================

app.get("/dashboard", (req, res) => {

    if (!req.session.user) {
        return res.send("Access Denied. Please login first.");
    }

    res.sendFile(
        path.join(__dirname, "public", "dashboard.html")
    );
});

// ==================== LOGOUT ====================

app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            return res.send("Error while logging out.");
        }

        res.redirect("/login");

    });
});

// ==================== BIRTH CERTIFICATE PAGE ====================

app.get("/birth", (req, res) => {

    if (!req.session.user) {
        return res.send("Please login first.");
    }

    res.sendFile(
        path.join(__dirname, "public", "birth.html")
    );
});

// ==================== ADD SERVICES ====================

app.get("/add-services", async (req, res) => {

    try {

        await service.insertMany([

            {
                serviceName: "Birth Certificate",
                description: "Apply for Birth Certificate",

                requiredDocuments: [
                    "Aadhaar Card",
                    "Hospital Certificate"
                ],

                estimatedTime: "7 Days",
                serviceCharge: 100
            },

            {
                serviceName: "Income Certificate",
                description: "Apply for Income Certificate",

                requiredDocuments: [
                    "Aadhaar Card",
                    "Income Proof"
                ],

                estimatedTime: "10 Days",
                serviceCharge: 150
            }

        ]);

        res.send("Services Added Successfully!");

    } catch (err) {

        console.log(err);
        res.send("Error adding services.");

    }
});

// ==================== GET SERVICES ====================

app.get("/services", async (req, res) => {

    try {

        const services = await service.find();

        res.json(services);

    } catch (err) {

        console.log(err);
        res.send("Error fetching services");

    }
});

// ==================== APPLY FOR SERVICE ====================

app.post(
    "/apply",
    upload.single("document"),
    async (req, res) => {

        try {

            // Check login
            if (!req.session.user) {
                return res.send("Please login first.");
            }

            // Create application
            const newApplication = new application({

                fullname: req.body.fullname,

                // Automatically take email from logged-in user
                email: req.session.user.email,

                aadhaar: req.body.aadhaar,

                mobile: req.body.mobile,

                address: req.body.address,

                service: req.body.service,

                documents: req.file
                    ? req.file.path
                    : "",

                status: "Pending"
            });

            // Save to MongoDB
            await newApplication.save();

            res.send(`
                <h2>Application submitted successfully! 🎉</h2>
                <p>Your application status is: <b>Pending</b></p>
                <a href="/my-applications">View My Applications</a>
            `);

        } catch (err) {

            console.log(err);

            res.send(
                "Error: " + err.message
            );

        }

    }
);

// ==================== MY APPLICATIONS ====================

app.get("/my-applications", async (req, res) => {

    try {

        // Check login
        if (!req.session.user) {
            return res.send("Please login first.");
        }

        // Find only logged-in user's applications
        const applications = await application.find({
            email: req.session.user.email
        });

        res.json(applications);

    } catch (err) {

        console.log(err);

        res.send(
            "Error fetching applications."
        );

    }
});

// ==================== SERVER ====================

app.listen(PORT, () => {

    console.log(
        `Server is running on http://localhost:${PORT}`
    );

});

