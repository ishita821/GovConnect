const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    serviceName: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    requiredDocuments: [{
        type: String
    }],

    estimatedTime: {
        type: String,
        required: true
    },

    serviceCharge: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("Service", serviceSchema);