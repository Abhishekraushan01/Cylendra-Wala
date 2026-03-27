# Cylendra Wala

Cylendra Wala is a placement-ready LPG delivery aggregator starter built from an industry-style blueprint. It includes a Node.js + Express + MongoDB backend and a React + Vite frontend aligned with customer, rider, and admin workflows.

## Tech Stack

- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt
- Frontend: React, Vite, Axios
- Integrations included: Razorpay-ready payment flow with demo fallback
- Integrations planned next: Google Maps, Firebase
- Deployment targets: Render, Vercel, MongoDB Atlas

## Backend Features

- JWT authentication for `user`, `rider`, and `admin`
- User, Rider, Dealer, and Order schemas
- Order lifecycle support for `pending`, `accepted`, `picked`, and `delivered`
- Nearby rider matching using Euclidean distance
- OTP generation for delivery verification
- Revenue split fields for dealer, rider, and platform
- Razorpay-ready payment order creation and signature verification
- Demo payment success mode when live Razorpay keys are not configured
- Admin endpoints for orders, riders, dealers, and revenue summary
- Seed script for demo-ready users, dealers, and riders
- Email-based password reset OTP for customer/admin and rider accounts

## Frontend Features

- Customer booking form with dealer selection and order history
- Pay-now flow connected to backend payment endpoints
- Rider panel for accepting orders, marking pickup, and OTP delivery completion
- Admin dashboard wired to live orders, riders, dealers, and revenue data
- Login and registration pages wired to backend APIs
- Reusable components for order button, map view, and order status

## Setup

### 1. Backend

```bash
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

### 2. Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

## Gmail OTP Setup

The forgot-password flow now uses email OTP instead of SMS. To send real OTP emails through Gmail:

1. Turn on 2-Step Verification in your Google account.
2. Create a Google App Password for Mail.
3. Put these values in [backend/.env](D:/GitHub/Cylinder-wala/backend/.env):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=Cylendra Wala <your-gmail-address@gmail.com>
```

If these values are missing or left as placeholders, the app falls back to demo email mode and shows the OTP in the UI instead of sending a real email.

## Demo Accounts

- Customer: `8888888888` / `123456` / `customer@cylendrawala.demo`
- Admin: `9999999999` / `123456` / `admin@cylendrawala.demo`
- Rider: `7000000011` / `123456` / `rahul.rider@cylendrawala.demo`

## Payment Notes

- If `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are real values, the customer payment flow will open Razorpay Checkout.
- If those values are left as placeholders, the app automatically uses a local demo-payment path so you can still present the full project.

## Demo Flow

1. Login as the customer and create an order from the home page.
2. Click `Pay Now` to complete payment.
3. Open the rider workspace and accept the pending order.
4. Mark the order as picked to generate the OTP.
5. Verify the OTP to complete delivery.
6. Login as admin and open the dashboard to show updated revenue.
7. Use forgot password with the registered email if you want to test email OTP delivery.

## Core API Endpoints

### User

- `GET /api/user/dealers`
- `GET /api/user/public-metrics`
- `POST /api/user/register`
- `POST /api/user/login`
- `POST /api/user/forgot-password`
- `POST /api/user/reset-password`
- `GET /api/user/profile`
- `POST /api/user/location`

### Order

- `POST /api/order/create`
- `POST /api/order/payment/create`
- `POST /api/order/payment/verify`
- `POST /api/order/payment/demo-success`
- `GET /api/order/:id`
- `GET /api/order/user/:userid`
- `PUT /api/order/status`
- `POST /api/order/verify-otp`

### Rider

- `POST /api/rider/login`
- `POST /api/rider/forgot-password`
- `POST /api/rider/reset-password`
- `GET /api/rider/orders`
- `PUT /api/rider/accept`
- `PUT /api/rider/location`
- `PUT /api/rider/status`

### Admin

- `GET /api/admin/orders`
- `GET /api/admin/revenue`
- `GET /api/admin/riders`
- `GET /api/admin/dealers`

## Verification Completed

- Frontend production build completed successfully with `npm run build`
- Backend API tests pass with `npm test`
- Payment UI and backend payment endpoints compile cleanly
- Live order, rider, OTP, and admin revenue flow had already been verified

## Next Recommended Enhancements

- Replace placeholder map component with Google Maps route rendering
- Add Firebase push notifications for nearby riders
- Add charts, filters, and live tables to the admin dashboard
- Add dealer login and dealer notification inbox
