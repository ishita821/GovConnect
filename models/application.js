const mongoose = require("mongoose");
const applicationSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    aadhaar: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    },
    documents: {
        type: String
    },
    status: {
        type: String,
        default: "Pending"
    },
    appliedOn: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Application", applicationSchema);