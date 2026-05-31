const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Room = require("./models/Room");
const Booking = require("./models/Booking");
const connectDB = require("./config/db");

const rooms = [
  {
    roomNumber: 101,
    type: "Standard",
    price: 1800,
    capacity: 2,
    amenities: ["WiFi", "AC", "TV"],
    imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80",
    description: "A clean, comfortable room for short business and family stays."
  },
  {
    roomNumber: 108,
    type: "Standard",
    price: 2200,
    capacity: 2,
    amenities: ["WiFi", "AC", "Desk"],
    imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80",
    description: "A bright standard room with a work desk and simple modern comfort."
  },
  {
    roomNumber: 205,
    type: "Deluxe",
    price: 3200,
    capacity: 3,
    amenities: ["WiFi", "Breakfast", "Balcony", "Room Service"],
    imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    description: "A spacious room with premium comfort and a city-facing balcony."
  },
  {
    roomNumber: 212,
    type: "Deluxe",
    price: 3800,
    capacity: 3,
    amenities: ["WiFi", "Breakfast", "Smart TV", "Balcony"],
    imageUrl: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80",
    description: "A deluxe room with extra space, soft lighting, and premium service."
  },
  {
    roomNumber: 401,
    type: "Suite",
    price: 6200,
    capacity: 4,
    amenities: ["WiFi", "Mini Bar", "Bathtub", "Workspace"],
    imageUrl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
    description: "A premium suite for guests who want a refined, full-service stay."
  },
  {
    roomNumber: 410,
    type: "Suite",
    price: 7500,
    capacity: 4,
    amenities: ["WiFi", "Mini Bar", "Living Area", "Bathtub"],
    imageUrl: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=900&q=80",
    description: "A luxury suite with a separate living area and elevated amenities."
  },
  {
    roomNumber: 301,
    type: "Family",
    price: 4500,
    capacity: 5,
    amenities: ["WiFi", "Two Beds", "Breakfast", "Extra Storage"],
    imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
    description: "A roomy family stay with flexible sleeping space and daily breakfast."
  },
  {
    roomNumber: 305,
    type: "Family",
    price: 5200,
    capacity: 6,
    amenities: ["WiFi", "Two Beds", "Kids Area", "Room Service"],
    imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80",
    description: "A larger family room designed for groups who need extra comfort."
  }
];

const seed = async () => {
  await connectDB();

  const adminPassword = await bcrypt.hash("admin123", 10);
  await User.findOneAndUpdate(
    { email: "admin@hotel.com" },
    {
      name: "Hotel Admin",
      email: "admin@hotel.com",
      password: adminPassword,
      role: "admin"
    },
    { upsert: true, new: true }
  );

  await Room.deleteMany({ type: { $nin: ["Standard", "Deluxe", "Suite", "Family"] } });

  for (const room of rooms) {
    await Room.findOneAndUpdate(
      { roomNumber: room.roomNumber },
      room,
      { upsert: true, new: true }
    );
  }

  const bookedRoomIds = await Booking.distinct("roomId", { status: "confirmed" });
  await Room.updateMany({}, { available: true });
  if (bookedRoomIds.length > 0) {
    await Room.updateMany({ _id: { $in: bookedRoomIds } }, { available: false });
  }

  console.log("Seed complete");
  console.log("Admin login: admin@hotel.com / admin123");
  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
