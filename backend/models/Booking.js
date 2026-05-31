const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  guests: {
    type: Number,
    default: 1,
    min: 1
  },
  totalCost: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending"
  },
  paymentMethod: {
    type: String,
    enum: ["dummy", "stripe", "razorpay"],
    default: "dummy"
  },
  status: {
    type: String,
    enum: ["confirmed", "cancelled", "completed"],
    default: "confirmed"
  }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
