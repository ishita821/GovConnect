const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const User = require("./models/user");
const application = require("./models/application");
const service = require("./models/service");
const bcrypt = require("bcrypt");
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });
const app = express();
const session = require("express-session");

app.use(session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false
}));
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log("MongoDB connection error:", err);
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.send("Access Denied. Please login first.");
    }

  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.post("/register", async (req, res) => {
    console.log(req.body);
    try {
         if (req.body.password !== req.body.confirmpassword) {
            return res.send("Passwords do not match");
        }
        delete req.body.confirmpassword;
           const hashedPassword = await bcrypt.hash(req.body.password, 10);
                const user = new User({
                  fullname: req.body.fullname,
                  mobile: req.body.mobile,
                  email: req.body.email,
                  password: hashedPassword
});
        await user.save();

        res.send("Registration Successful!");

    } catch (err) {

        console.log(err);
        res.send("Error while registering.");

    }

});

app.post("/login", async (req, res) => {

    try {

        // find user by email
        const user = await User.findOne({ email: req.body.email });

        // if user not found
        if (!user) {
            return res.send("User not found");
        }

        // check password
        const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.send("Incorrect password");
}
        req.session.user = user;
        res.redirect("/dashboard");

    } catch (err) {
        console.log(err);
        res.send("Error during login");
    }

});

const PORT = process.env.PORT || 3000;
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error while logging out.");
        }

        res.redirect("/login");
    });
});

app.get("/birth", (req, res) => {
    if (!req.session.user) {
        return res.send("Please login first.");
    }

    res.sendFile(path.join(__dirname, "public", "birth.html"));
});
app.get("/income", (req, res) => {
    if (!req.session.user) {
        return res.send("Please login first.");
    }

    res.sendFile(path.join(__dirname, "public", "income.html"));
});
app.get("/caste", (req, res) => {
    if (!req.session.user) {
        return res.send("Please login first.");
    }

    res.sendFile(path.join(__dirname, "public", "caste.html"));
});
app.get("/domicile", (req, res) => {
    if (!req.session.user) {
        return res.send("Please login first.");
    }

    res.sendFile(path.join(__dirname, "public", "domicile.html"));
});
app.get("/pan-aadhaar", (req, res) => {
    if (!req.session.user) {
        return res.send("Please login first.");
    }

    res.sendFile(path.join(__dirname, "public", "pan-aadhaar.html"));
});
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
app.get("/services", async (req, res) => {
    try {
        const services = await service.find();
        res.json(services);
    } catch (err) {
        console.log(err);
        res.send("Error fetching services");
    }
});
app.post("/apply", upload.single("document"), async (req, res) => {
    try {
        const newApplication = new application({
            fullname: req.body.fullname,
            aadhaar: req.body.aadhaar,
            mobile: req.body.mobile,
            address: req.body.address,
            service: req.body.service,
            documents: req.file ? req.file.filename : ""
        });

        await newApplication.save();

        res.send("Application submitted successfully!");
    } catch (err) {
        console.log(err);
        res.send("Error submitting application.");
    }
});
app.get("/my-applications", async (req, res) => {
    try {
        const applications = await application.find();
        res.json(applications);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error fetching applications" });
    }
});
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin/applications", async (req, res) => {
    try {
        const applications = await application.find();
        res.json(applications);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error fetching applications" });
    }
});
app.post("/admin/update-status", async (req, res) => {
    try {
        await application.findByIdAndUpdate(
            req.body.id,
            { status: req.body.status }
        );

        res.send("Status updated successfully!");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error updating status.");
    }
});
app.get("/my-applications-page", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "my-applications.html"));
});
app.get("/admin/stats", async (req, res) => {
    try {
        const total = await application.countDocuments();
        const pending = await application.countDocuments({ status: "Pending" });
        const approved = await application.countDocuments({ status: "Approved" });
        const rejected = await application.countDocuments({ status: "Rejected" });

        res.json({
            total,
            pending,
            approved,
            rejected
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error fetching statistics" });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});