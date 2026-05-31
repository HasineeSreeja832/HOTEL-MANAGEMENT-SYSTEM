const API_URL = "http://localhost:5000/api";

const state = {
  token: localStorage.getItem("hotelToken"),
  user: JSON.parse(localStorage.getItem("hotelUser") || "null"),
  rooms: [],
  loginMode: "user"
};

const roomTypeOrder = ["Standard", "Deluxe", "Suite", "Family"];

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || "Request failed");
  return data;
};

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const toast = (message, type = "success") => {
  const box = qs("#toast");
  box.textContent = message;
  box.className = type;
  setTimeout(() => {
    box.textContent = "";
    box.className = "";
  }, 3000);
};

const saveSession = ({ token, user }) => {
  state.token = token;
  state.user = user;
  localStorage.setItem("hotelToken", token);
  localStorage.setItem("hotelUser", JSON.stringify(user));
  renderSession();
};

const clearAuthFields = () => {
  qsa("#authDialog input[type='password']").forEach((input) => {
    input.value = "";
    input.type = "password";
  });
  qsa("#authDialog [data-password-toggle]").forEach((checkbox) => {
    checkbox.checked = false;
  });
};

const openAuth = (mode = "login") => {
  clearAuthFields();
  qs("#loginForm").classList.toggle("hidden", mode !== "login");
  qs("#registerForm").classList.toggle("hidden", mode !== "register");
  if (!qs("#authDialog").open) {
    qs("#authDialog").showModal();
  }
};

const setLoginMode = (mode) => {
  state.loginMode = mode;
  const isAdmin = mode === "admin";

  qs("#loginTitle").textContent = isAdmin ? "Admin Login" : "User Login";
  qs("#loginHelp").textContent = isAdmin
    ? "Login as admin to manage rooms, users, analytics, and all booking history."
    : "Login to book rooms and view your own booking history.";
  qs("#userLoginChoice").classList.toggle("choice-active", !isAdmin);
  qs("#adminLoginChoice").classList.toggle("choice-active", isAdmin);
};

const renderSession = () => {
  const isLoggedIn = Boolean(state.token);
  qs("#loginNavBtn").classList.toggle("hidden", isLoggedIn);
  qs("#logoutBtn").classList.toggle("hidden", !isLoggedIn);
  qs("#adminNav").classList.toggle("hidden", state.user?.role !== "admin");
  qs("#bookingsNav").textContent = state.user?.role === "admin" ? "All Bookings" : "My Bookings";
};

const switchView = (view) => {
  qsa(".view").forEach((item) => item.classList.add("hidden"));
  qs(`#${view}View`).classList.remove("hidden");

  if (view === "bookings") loadBookings().catch((error) => toast(error.message, "error"));
  if (view === "admin") loadAdmin().catch((error) => toast(error.message, "error"));
};

const roomImage = (room) => room.imageUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80";

const loadRooms = async () => {
  const type = qs("#typeFilter").value;
  const maxPrice = qs("#maxPriceFilter").value;
  const params = new URLSearchParams();

  if (type) params.set("type", type);
  if (maxPrice) params.set("maxPrice", maxPrice);

  const rooms = await request(`/rooms?${params.toString()}`);
  state.rooms = rooms.sort((a, b) => {
    const typeDifference = roomTypeOrder.indexOf(a.type) - roomTypeOrder.indexOf(b.type);
    return typeDifference || a.price - b.price || a.roomNumber - b.roomNumber;
  });
  renderRooms();
};

const renderRooms = () => {
  const search = qs("#searchInput").value.toLowerCase();
  const selectedType = qs("#typeFilter").value;
  const roomsDiv = qs("#rooms");
  const rooms = state.rooms.filter((room) => {
    const matchesType = !selectedType || room.type === selectedType;
    const matchesSearch = room.type.toLowerCase().includes(search);
    return matchesType && matchesSearch;
  });
  const availableCount = rooms.filter((room) => room.available).length;

  qs("#roomSummary").innerHTML = `
    <strong>${availableCount}</strong>
    <span>of ${rooms.length} rooms available</span>
  `;

  roomsDiv.innerHTML = rooms.map((room) => `
    <article class="room-card">
      <img src="${roomImage(room)}" alt="${room.type} room">
      <div class="room-body">
        <div class="room-heading">
          <h3>Room ${room.roomNumber}</h3>
          <span>${room.type}</span>
        </div>
        <div class="room-meta">
          <small>${room.capacity || 2} guests</small>
          <small class="${room.available ? "available" : "booked"}">${room.available ? "Available" : "Booked"}</small>
        </div>
        <p>${room.description || "Comfortable stay with essential hotel amenities."}</p>
        <div class="amenities">
          ${(room.amenities?.length ? room.amenities : ["WiFi", "AC", "Room Service"]).map((item) => `<small>${item}</small>`).join("")}
        </div>
        <div class="room-footer">
          <strong>${money(room.price)} / day</strong>
          <button onclick="openBooking('${room._id}')" ${room.available ? "" : "disabled"}>
            ${room.available ? "Book Now" : "Booked"}
          </button>
        </div>
      </div>
    </article>
  `).join("") || `<p class="empty">No rooms found.</p>`;
};

window.openBooking = (roomId) => {
  if (!state.token) {
    toast("Please login before booking", "error");
    openAuth("login");
    return;
  }

  const room = state.rooms.find((item) => item._id === roomId);
  qs("#bookingTitle").textContent = `Book Room ${room.roomNumber}`;
  qs("#bookingForm").roomId.value = roomId;
  qs("#bookingDialog").showModal();
};

const bookingTemplate = (booking) => {
  const room = booking.roomId || {};
  const showGuest = state.user?.role === "admin" && booking.userId;
  return `
    <article class="booking-item">
      <div>
        <h3>Room ${room.roomNumber || "N/A"} - ${room.type || "Room"}</h3>
        ${showGuest ? `<p class="guest-line">Guest: ${booking.userId.name} (${booking.userId.email})</p>` : ""}
        <p>${new Date(booking.checkIn).toLocaleDateString()} to ${new Date(booking.checkOut).toLocaleDateString()}</p>
        <small>Status: ${booking.status} | Payment: ${booking.paymentStatus}</small>
      </div>
      <div>
        <strong>${money(booking.totalCost)}</strong>
        ${booking.status === "confirmed" ? `<button onclick="cancelBooking('${booking._id}')">Cancel</button>` : ""}
      </div>
    </article>
  `;
};

const loadBookings = async () => {
  if (!state.token) {
    qs("#bookings").innerHTML = `<p class="empty">Login to view your bookings.</p>`;
    openAuth("login");
    return;
  }

  const isAdmin = state.user?.role === "admin";
  qs("#bookingsTitle").textContent = isAdmin ? "All Booking History" : "My Booking History";
  qs("#bookingsSubtitle").textContent = isAdmin
    ? "Admin view: bookings from all users, including guest details and payment status."
    : "User view: only your personal confirmed, cancelled, and completed bookings.";

  const bookings = await request("/bookings");
  qs("#bookings").innerHTML = bookings.map(bookingTemplate).join("") || `<p class="empty">No bookings yet.</p>`;
};

window.cancelBooking = async (id) => {
  await request(`/bookings/${id}/cancel`, { method: "PATCH" });
  toast("Booking cancelled");
  await loadBookings();
  if (state.user?.role === "admin") await loadAdmin();
};

const loadAdmin = async () => {
  if (state.user?.role !== "admin") {
    toast("Admin access required", "error");
    switchView("rooms");
    return;
  }

  const [summary, bookings, users] = await Promise.all([
    request("/bookings/analytics/summary"),
    request("/bookings"),
    request("/users")
  ]);

  qs("#analytics").innerHTML = [
    ["Total bookings", summary.totalBookings],
    ["Active bookings", summary.activeBookings],
    ["Revenue", money(summary.revenue)],
    ["Available rooms", `${summary.availableRooms}/${summary.totalRooms}`]
  ].map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join("");

  qs("#adminBookings").innerHTML = bookings.map((booking) => `
    <div class="compact-row">
      <span>Room ${booking.roomId?.roomNumber || "N/A"} - ${booking.userId?.name || "Guest"}</span>
      <strong>${money(booking.totalCost)}</strong>
    </div>
  `).join("") || `<p class="empty">No bookings yet.</p>`;

  qs("#usersList").innerHTML = users.map((user) => `
    <div class="compact-row">
      <span>${user.name}<small>${user.email}</small></span>
      <strong>${user.role}</strong>
    </div>
  `).join("");
};

qs("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(event.target));
    const data = await request("/users/register", {
      method: "POST",
      body: JSON.stringify(body)
    });
    saveSession(data);
    qs("#authDialog").close();
    toast("Account created");
  } catch (error) {
    toast(error.message, "error");
  }
});

qs("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(event.target));
    const data = await request("/users/login", {
      method: "POST",
      body: JSON.stringify(body)
    });
    saveSession(data);
    qs("#authDialog").close();
    toast("Logged in");
  } catch (error) {
    toast(error.message, "error");
  }
});

qs("#bookingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(event.target));
    await request("/bookings", {
      method: "POST",
      body: JSON.stringify(body)
    });
    qs("#bookingDialog").close();
    event.target.reset();
    toast("Booking confirmed and payment captured");
    await loadRooms();
    await loadBookings();
  } catch (error) {
    toast(error.message, "error");
  }
});

qs("#roomForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(event.target));
    body.amenities = body.amenities ? body.amenities.split(",").map((item) => item.trim()) : [];

    await request("/rooms", {
      method: "POST",
      body: JSON.stringify(body)
    });

    event.target.reset();
    toast("Room added");
    await loadRooms();
    await loadAdmin();
  } catch (error) {
    toast(error.message, "error");
  }
});

qs("#closeBookingBtn").addEventListener("click", () => qs("#bookingDialog").close());
qs("#loginNavBtn").addEventListener("click", () => openAuth("login"));
qs("#closeAuthBtn").addEventListener("click", () => qs("#authDialog").close());
qs("#showRegisterBtn").addEventListener("click", () => openAuth("register"));
qs("#showLoginBtn").addEventListener("click", () => openAuth("login"));
qs("#userLoginChoice").addEventListener("click", () => setLoginMode("user"));
qs("#adminLoginChoice").addEventListener("click", () => setLoginMode("admin"));
qsa("[data-password-toggle]").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    const form = qs(`#${checkbox.dataset.passwordToggle}`);
    const password = form.querySelector("input[name='password']");
    password.type = checkbox.checked ? "text" : "password";
  });
});
qs("#loadRoomsBtn").addEventListener("click", () => loadRooms().catch((error) => toast(error.message, "error")));
qs("#typeFilter").addEventListener("change", () => loadRooms().catch((error) => toast(error.message, "error")));
qs("#searchInput").addEventListener("input", renderRooms);
qsa("[data-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));

qs("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("hotelToken");
  localStorage.removeItem("hotelUser");
  state.token = null;
  state.user = null;
  clearAuthFields();
  renderSession();
  switchView("rooms");
  toast("Logged out");
});

renderSession();
setLoginMode("user");
loadRooms().catch((error) => toast(error.message, "error"));
