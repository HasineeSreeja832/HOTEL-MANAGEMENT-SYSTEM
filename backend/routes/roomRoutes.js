const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const Booking = require("../models/Booking");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const buildRoomQuery = (query) => {
  const filters = {};

  if (query.type) filters.type = query.type;
  if (query.available) filters.available = query.available === "true";
  if (query.minPrice || query.maxPrice) {
    filters.price = {};
    if (query.minPrice) filters.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filters.price.$lte = Number(query.maxPrice);
  }

  return filters;
};

router.post("/", auth, admin, async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ msg: "Unable to add room", error: error.message });
  }
});

router.get("/", async (req, res) => {
  const rooms = await Room.find(buildRoomQuery(req.query)).sort({ type: 1, price: 1, roomNumber: 1 });
  const bookedRoomIds = await Booking.distinct("roomId", { status: "confirmed" });
  const bookedRoomSet = new Set(bookedRoomIds.map((id) => id.toString()));
  const roomsWithLiveAvailability = rooms.map((room) => ({
    ...room.toObject(),
    available: room.available && !bookedRoomSet.has(room._id.toString())
  }));

  res.json(roomsWithLiveAvailability);
});

router.get("/:id", async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ msg: "Room not found" });
  const activeBooking = await Booking.exists({
    roomId: req.params.id,
    status: "confirmed"
  });

  res.json({
    ...room.toObject(),
    available: room.available && !activeBooking
  });
});

router.put("/:id", auth, admin, async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!room) return res.status(404).json({ msg: "Room not found" });
  res.json(room);
});

router.delete("/:id", auth, admin, async (req, res) => {
  const room = await Room.findByIdAndDelete(req.params.id);
  if (!room) return res.status(404).json({ msg: "Room not found" });
  res.json({ msg: "Room deleted" });
});

router.get("/:id/availability", async (req, res) => {
  const { checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut || new Date(checkIn) >= new Date(checkOut)) {
    return res.status(400).json({ msg: "Valid check-in and check-out dates are required" });
  }

  const overlap = await Booking.findOne({
    roomId: req.params.id,
    status: "confirmed",
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) }
  });

  res.json({ available: !overlap });
});

module.exports = router;
