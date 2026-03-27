# Cylendra-Wala

Cylendra-Wala is a production-ready LPG cylinder delivery logistics platform designed to manage customers, dealers, riders and administrators in a scalable delivery ecosystem.

## Tech Stack

### Backend
Node.js  
Express.js  
MongoDB  
Mongoose  
JWT Authentication  
bcrypt  

### Frontend
React.js  
Vite  
Axios  

### Integrations
Razorpay Payment Gateway  

### Deployment Targets
Render  
Vercel  
MongoDB Atlas

## System Architecture

Role based authentication (Customer, Rider, Dealer, Admin)

Service area based order validation

Rider assignment based on proximity and workload

OTP based delivery verification

Modular REST API structure

Secure payment verification workflow

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

## Local Development Setup

### Backend

cd backend

copy .env.example .env

npm install

npm run seed

npm run dev


### Frontend

cd frontend

copy .env.example .env

npm install

npm run dev

## Email OTP Configuration

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

## Payment Notes

- If `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are real values, the customer payment flow will open Razorpay Checkout.
- If those values are left as placeholders, the app automatically uses a local demo-payment path so you can still present the full project.

## Order Workflow
Customer places cylinder order

Payment is processed

Dealer receives order

Rider accepts delivery

Rider picks cylinder

Customer shares OTP

Rider verifies OTP

Order marked delivered

Admin dashboard updates revenue

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


## Next Recommended Enhancements

- Replace placeholder map component with Google Maps route rendering
- Add Firebase push notifications for nearby riders
- Add charts, filters, and live tables to the admin dashboard
- Add dealer login and dealer notification inbox

## License

This project is proprietary software developed for Cylendra-Wala operations.