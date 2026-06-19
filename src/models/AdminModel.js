const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    admin_name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin'],
        default: 'superadmin',
    },
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);