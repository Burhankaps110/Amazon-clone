# 🛒 E-Commerce Full-Stack — Node/Express/MongoDB/Razorpay

Production-grade e-commerce backend with JWT auth, persistent cart, order management and Razorpay payment integration.

---

## 📁 Folder Structure

```
ecommerce-backend/
├── server.js               ← Express app entry point
├── config/
│   └── db.js               ← MongoDB connection
├── models/
│   ├── User.js             ← User schema (bcrypt, JWT)
│   ├── Product.js          ← Product schema (reviews, ratings)
│   ├── Cart.js             ← Cart schema (persistent)
│   └── Order.js            ← Order schema (full lifecycle)
├── routes/
│   ├── auth.js             ← /api/auth/*
│   ├── products.js         ← /api/products/*
│   ├── cart.js             ← /api/cart/*
│   ├── orders.js           ← /api/orders/*
│   └── payment.js          ← /api/payment/*
├── middleware/
│   └── auth.js             ← JWT protect + restrictTo
├── utils/
│   ├── seeder.js           ← Sample data seeder
│   └── api.js              ← Frontend API client (drop into React /src)
├── .env.example
└── package.json
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd ecommerce-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, Razorpay keys
```

### 3. Seed the database
```bash
npm run seed
# Creates sample products + admin user
# admin@ecommerce.com / Admin@1234
```

### 4. Start the server
```bash
npm run dev   # development (nodemon)
npm start     # production
```

---

## 🔑 API Reference

### Auth  `/api/auth`
| Method | Endpoint            | Auth | Description        |
|--------|---------------------|------|--------------------|
| POST   | /signup             | ✗    | Register user      |
| POST   | /login              | ✗    | Login → JWT token  |
| GET    | /me                 | ✓    | Get current user   |
| PATCH  | /me                 | ✓    | Update profile     |
| POST   | /change-password    | ✓    | Change password    |

### Products  `/api/products`
| Method | Endpoint            | Auth  | Description              |
|--------|---------------------|-------|--------------------------|
| GET    | /                   | ✗     | List (search/filter/sort)|
| GET    | /:id                | ✗     | Get single product       |
| POST   | /:id/reviews        | ✓     | Add review               |
| POST   | /                   | Admin | Create product           |
| PATCH  | /:id                | Admin | Update product           |
| DELETE | /:id                | Admin | Soft delete product      |

### Cart  `/api/cart`  (all routes require auth)
| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| GET    | /                   | Get user's cart          |
| POST   | /add                | Add item to cart         |
| PATCH  | /item/:productId    | Update item quantity     |
| DELETE | /item/:productId    | Remove item              |
| DELETE | /clear              | Clear entire cart        |

### Orders  `/api/orders`  (all routes require auth)
| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| POST   | /                   | Create order from cart   |
| GET    | /                   | Order history            |
| GET    | /:id                | Get single order         |
| POST   | /:id/cancel         | Cancel order             |
| GET    | /admin/all          | Admin: all orders        |

### Payment  `/api/payment`  (all routes require auth)
| Method | Endpoint            | Description                    |
|--------|---------------------|--------------------------------|
| POST   | /create-order       | Create Razorpay order          |
| POST   | /verify             | Verify payment signature       |
| POST   | /webhook            | Razorpay webhook handler       |

---

## 💳 Payment Flow (Razorpay)

```
1. Frontend: ordersAPI.create(address, 'upi')    → creates order in DB
2. Frontend: paymentAPI.createOrder(orderId)     → Razorpay order created
3. Frontend: Razorpay SDK opens payment modal
4. User pays
5. Frontend: paymentAPI.verify({ signatures })   → HMAC verified, order confirmed
```

For COD: skip steps 2-5. Order status stays `placed` until delivery.

---

## 🔒 Security Features

- **bcryptjs** password hashing (12 rounds)
- **JWT** with expiry + password-change invalidation
- **Helmet** HTTP security headers
- **Rate limiting** — global (100/15min) + auth (10/15min)
- **Input size limit** — 10kb JSON body
- **Razorpay HMAC** signature verification (prevents payment spoofing)
- **Stock validation** before order creation
- **Soft deletes** — products never truly deleted
- **Role-based access** — user vs admin routes

---

## 🌐 Frontend Integration

1. Copy `utils/api.js` into your React `src/` folder
2. Add to `.env`:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```
3. Import and use:
   ```js
   import { authAPI, cartAPI, ordersAPI, openRazorpay } from './api';

   // Login
   const { token, user } = await authAPI.login(email, password);
   setToken(token);

   // Add to cart
   await cartAPI.add(productId, 1);

   // Place order + pay
   const order = await ordersAPI.create(shippingAddress, 'upi');
   await openRazorpay({ orderId: order._id, user, onSuccess: () => router.push('/success') });
   ```

---

## 📈 Scale Notes

- Add **Redis** for session caching and cart (remove MongoDB cart dependency)
- Add **Elasticsearch** to replace MongoDB text search at scale
- Move to **microservices**: separate auth, product, order, and payment services
- Add **message queue** (RabbitMQ / SQS) for order events (email, inventory sync)
- Add **CDN** (Cloudfront) for product images
