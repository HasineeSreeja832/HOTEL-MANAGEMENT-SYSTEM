const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const calculateNights = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};

router.post("/", auth, async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guests = 1, paymentMethod = "dummy" } = req.body;
    const nights = calculateNights(checkIn, checkOut);

    if (!roomId || !checkIn || !checkOut || nights <= 0) {
      return res.status(400).json({ msg: "Room and valid dates are required" });
    }

    const room = await Room.findById(roomId);
    if (!room || !room.available) {
      return res.status(404).json({ msg: "Room is not available" });
    }

    const activeRoomBooking = await Booking.findOne({
      roomId,
      status: "confirmed"
    });

    if (activeRoomBooking) {
      return res.status(409).json({ msg: "Room is already booked" });
    }

    const overlap = await Booking.findOne({
      roomId,
      status: "confirmed",
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) }
    });

    if (overlap) {
      return res.status(409).json({ msg: "Room is already booked for these dates" });
    }

    const booking = new Booking({
      userId: req.user.id,
      roomId,
      checkIn,
      checkOut,
      guests,
      totalCost: room.price * nights,
      paymentMethod,
      paymentStatus: paymentMethod === "dummy" ? "paid" : "pending"
    });

    await booking.save();
    await Room.findByIdAndUpdate(roomId, { available: false });
    await booking.populate("roomId", "roomNumber type price imageUrl");
    await booking.populate("userId", "name email");

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ msg: "Booking failed", error: error.message });
  }
});

router.get("/", auth, async (req, res) => {
  const query = req.user.role === "admin" ? {} : { userId: req.user.id };
  const bookings = await Booking.find(query)
    .populate("roomId", "roomNumber type price imageUrl")
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  res.json(bookings);
});

router.patch("/:id/cancel", auth, async (req, res) => {
  const query = req.user.role === "admin"
    ? { _id: req.params.id }
    : { _id: req.params.id, userId: req.user.id };

  const booking = await Booking.findOneAndUpdate(
    query,
    { status: "cancelled", paymentStatus: "refunded" },
    { new: true }
  ).populate("roomId", "roomNumber type price imageUrl");

  if (!booking) return res.status(404).json({ msg: "Booking not found" });

  const activeBookings = await Booking.countDocuments({
    roomId: booking.roomId._id,
    status: "confirmed"
  });

  if (activeBookings === 0) {
    await Room.findByIdAndUpdate(booking.roomId._id, { available: true });
  }

  res.json(booking);
});

router.get("/analytics/summary", auth, admin, async (req, res) => {
  const [totalBookings, activeBookings, cancelledBookings, totalRooms, revenueData] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ status: "confirmed" }),
    Booking.countDocuments({ status: "cancelled" }),
    Room.countDocuments(),
    Booking.aggregate([
      { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
      { $group: { _id: null, revenue: { $sum: "$totalCost" } } }
    ])
  ]);

  const revenue = revenueData[0]?.revenue || 0;
  const availableRooms = Math.max(totalRooms - activeBookings, 0);

  res.json({
    totalBookings,
    activeBookings,
    cancelledBookings,
    revenue,
    totalRooms,
    availableRooms
  });
});

module.exports = router;
