# ChickenCrew

Online ordering for **Karthika Chicken Centre**. Customers browse cuts, pick a weight, and place a scheduled delivery order. Prices, stock, offers, coupons, slots, and shop details come from the API. The shop edits them in admin. The site does not keep a second price list in the browser.

`karthikachickencentre.shop` was not serving a catalogue when this project was built, and a single public address and phone number could not be confirmed. Contact fields, opening hours, and delivery pincodes start empty. Checkout stays closed until the shop publishes pincodes. There are no invented reviews, customers, or past orders.

The opening menu is a **starter catalogue**: real cut names with setup prices and stock so the shop can be tried before the owner replaces every figure. A banner says so. Turn **Starter catalogue** off in admin after the real list is in.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Your admin sign-in is `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` (local password `crew-admin`). Use those on `/login` or `/admin/login`. Signing in on the shop with that pair also opens the admin panel. **Remember me** keeps the session for 30 days. Do not give this pair to Razorpay.

Razorpay's test account is a different pair: `TEST_LOGIN_EMAIL` and `TEST_LOGIN_PASSWORD`. That login is a normal customer on `/login` and cannot open admin. Change `AUTH_SECRET` before anyone else can reach the server.

Login uses a mobile OTP. Without an SMS provider, development mode returns the code on screen when `OTP_DEV_MODE=true` and `NODE_ENV` is not production. Production does not reveal the code. Plug in an SMS sender in `src/app/api/auth/otp/send/route.ts` before launch.

## Shop admin

`/admin`

- Products, categories, offers, coupons
- Delivery slots (create, disable, capacity, cutoff)
- Orders and status
- Customers
- Phone, WhatsApp, address, hours, map link
- Delivery pincodes, delivery fee, free-delivery threshold
- Cash on delivery and the online-payment switch

## Payments

Cash on delivery works without extra keys.

Online pay uses Razorpay. Set:

```bash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

The secret stays on the server. An order is marked paid only after signature verification (`/api/payment/verify`) or a signed webhook (`/api/payment/webhook`). The browser cannot mark an order paid by itself.

Point the Razorpay webhook at `https://karthikachickencentre.shop/api/payment/webhook`.

## Delivery

Slots are in `Asia/Kolkata`. A slot disappears after its cutoff or when it is full. The delivery fee is calculated on the server from admin settings. Orders outside the published pincodes are rejected.

## Data

The API reads and writes `data/db.json` (gitignored). On Vercel the file is copied to `/tmp` for that instance, so orders do not survive a new serverless instance. For a live shop, keep this process on a server with a disk, or replace `src/lib/store.ts` with a database. Clients never talk to the file directly.

## Checks

```bash
npm test
npm run build
```

## Cooking ideas

After an item is added, a small panel asks what you are making. It can suggest other cuts from this shop. Without `GROQ_API_KEY` it uses a short built-in reply. With a key, the server asks Groq and still checks the answer. Gym ideas are general food notes, not medical advice.

## Photographs

Some photographs are from Unsplash (whole chicken, raw breast, grilled breast). The curry cut, drumsticks, wings, boneless cubes, liver, and gizzard photographs were made for this site. Product images can be replaced with Cloudinary URLs in admin. Cloudinary URLs are requested as automatic format and a sized crop.
