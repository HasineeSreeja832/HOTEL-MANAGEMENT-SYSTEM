const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: Number,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ["Standard", "Deluxe", "Suite", "Family"]
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  capacity: {
    type: Number,
    default: 2,
    min: 1
  },
  amenities: [{
    type: String,
    trim: true
  }],
  imageUrl: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  available: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Room", roomSchema);
