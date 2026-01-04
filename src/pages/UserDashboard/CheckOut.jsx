// src/pages/UserDashboard/CartPage.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

export default function CartPage({ cart, setCart, showToast }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = React.useState("COD");

  const [showSuccess, setShowSuccess] = React.useState(false);
const [orderPaymentInfo, setOrderPaymentInfo] = React.useState("");



  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      )
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
    showToast("Item removed", "success");
  };

  const total = cart.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);

  function handlePlaceOrder() {
    if (cart.length === 0) return showToast("Cart is empty!", "error");
    const bookingId = localStorage.getItem("activeBookingId");
    const orderPayload = {
        userId: user?.id, 
         bookingId: bookingId ? Number(bookingId) : null,
 customerName: user?.name,


  items: cart.map((i) => ({
    menuItemId: i.id,
    name: i.name,
    qty: i.qty,
    price: i.price,
  })),
  total,
  paymentMethod,
  paymentStatus: paymentMethod === "COD" ? "PENDING" : "PAID",
};

fetch("http://localhost:8080/orders/place", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(orderPayload),
})
  .then((res) => res.json())
  .then(() => {
  if (paymentMethod === "COD") {
    setOrderPaymentInfo("Payment on delivery");
  } else {
    setOrderPaymentInfo(`Paid via ${paymentMethod}`);
  }

  setShowSuccess(true);

  setTimeout(() => {
    setCart([]);
    navigate("/dashboard/orders");
  }, 2000);
});


// clear cart after order placed
  }

  return (
    <>
  <div
    className={`p-6 max-w-3xl mx-auto ${
      showSuccess ? "blur-sm pointer-events-none" : ""
    }`}
  >

     <h2 className="text-2xl font-bold">Your Cart</h2>
<p className="text-sm text-gray-500 mb-6">
  Review items and choose payment to place your order
</p>


      {cart.length === 0 ? (
        <div className="text-gray-600 text-center mt-10">No items in cart.</div>
      ) : (
        <div className="space-y-5">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg p-4 shadow flex items-center gap-4"
            >
              <img
                src={item.img}
                alt={item.name}
                className="w-20 h-20 rounded object-cover"
              />

              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.name}</h4>
                <p className="text-sm text-gray-600">₹{item.price}</p>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="px-3 py-1 border rounded"
                  >
                    -
                  </button>
                  <div>{item.qty}</div>
                  <button
                    onClick={() => updateQty(item.id, +1)}
                    className="px-3 py-1 border rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold">
                  ₹{(item.price || 0) * item.qty}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-red-600 hover:underline mt-2"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
  <h4 className="font-semibold mb-3">Payment Method</h4>

  {["UPI", "QR", "CARD", "WALLET", "COD"].map((m) => (
    <label key={m} className="flex items-center gap-2 mb-2 text-sm">
      <input
        type="radio"
        name="payment"
        value={m}
        checked={paymentMethod === m}
        onChange={() => setPaymentMethod(m)}
      />
      {m === "COD" ? "Cash on Delivery (Pay Later)" : m}
    </label>
  ))}
</div>

          <div className="border-t pt-4 mt-4 flex justify-between items-center">
            <div className="text-lg font-bold">Total: ₹{total}</div>
            <button
              className="bg-amber-700 text-white px-6 py-2 rounded hover:bg-amber-800"
              onClick={handlePlaceOrder}
            >
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
        {showSuccess && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">

        <div className="bg-white rounded-2xl px-8 py-6 shadow-xl text-center border">
          <div className="text-2xl mb-2">✅</div>
          <h3 className="text-lg font-semibold text-gray-900">
            Payment Successful
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {orderPaymentInfo}
          </p>
        </div>
      </div>
    )}
    </>
  );
}
 
