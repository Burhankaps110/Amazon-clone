// ─────────────────────────────────────────────────────────────────
// api.js  — Drop this into your React /src folder
// Centralised fetch wrapper for the e-commerce backend
// ─────────────────────────────────────────────────────────────────

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Token helpers ──────────────────────────────────────────────────
export const setToken  = (t) => localStorage.setItem('token', t);
export const getToken  = ()  => localStorage.getItem('token');
export const clearToken= ()  => localStorage.removeItem('token');

// ── Core fetch ────────────────────────────────────────────────────
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const get    = (path)        => request('GET',    path);
const post   = (path, body)  => request('POST',   path, body);
const patch  = (path, body)  => request('PATCH',  path, body);
const del    = (path)        => request('DELETE', path);

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  signup:  (data)            => post('/auth/signup', data),
  login:   (email, password) => post('/auth/login', { email, password }),
  me:      ()                => get('/auth/me'),
  updateMe:(data)            => patch('/auth/me', data),
  changePw:(cur, nw)         => post('/auth/change-password', { currentPassword: cur, newPassword: nw }),
};

// ── Products ──────────────────────────────────────────────────────
export const productsAPI = {
  list:   (params = {}) => get('/products?' + new URLSearchParams(params).toString()),
  get:    (id)          => get(`/products/${id}`),
  review: (id, data)    => post(`/products/${id}/reviews`, data),
};

// ── Cart ──────────────────────────────────────────────────────────
export const cartAPI = {
  get:       ()                     => get('/cart'),
  add:       (productId, quantity)  => post('/cart/add', { productId, quantity }),
  setQty:    (productId, quantity)  => patch(`/cart/item/${productId}`, { quantity }),
  remove:    (productId)            => del(`/cart/item/${productId}`),
  clear:     ()                     => del('/cart/clear'),
};

// ── Orders ────────────────────────────────────────────────────────
export const ordersAPI = {
  create: (shippingAddress, paymentMethod) => post('/orders', { shippingAddress, paymentMethod }),
  list:   (page = 1)                       => get(`/orders?page=${page}`),
  get:    (id)                             => get(`/orders/${id}`),
  cancel: (id, reason)                     => post(`/orders/${id}/cancel`, { reason }),
};

// ── Payment ───────────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (orderId)         => post('/payment/create-order', { orderId }),
  verify:      (data)            => post('/payment/verify', data),
};

// ── Razorpay flow helper ──────────────────────────────────────────
// Call after ordersAPI.create() when paymentMethod = 'upi' | 'card'
export async function openRazorpay({ orderId, user, onSuccess, onFailure }) {
  const { razorpayOrderId, amount, currency, key } = await paymentAPI.createOrder(orderId);

  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key,
      amount,
      currency,
      name: 'Amazon Clone',
      description: 'Order Payment',
      order_id: razorpayOrderId,
      prefill: { name: user.name, email: user.email },
      theme: { color: '#FF9900' },
      handler: async (response) => {
        try {
          const verified = await paymentAPI.verify({
            razorpayOrderId:  response.razorpay_order_id,
            razorpayPaymentId:response.razorpay_payment_id,
            razorpaySignature:response.razorpay_signature,
            orderId,
          });
          onSuccess?.(verified.order);
          resolve(verified.order);
        } catch (err) {
          onFailure?.(err);
          resolve(null);
        }
      },
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.open();
  });
}
