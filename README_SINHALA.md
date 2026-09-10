# NOVA Storefront — Supabase Setup & Deploy Guide (සිංහලෙන්)

මේ Guide එකේ තියෙන්නේ ඔයාගේ NOVA E-commerce web app එක Supabase database එකකට connect කරලා live deploy කරගන්න **ඔයා විසින් කළ යුතු පියවර පමණි**.

---

## 📌 පියවර 1: Supabase Project එකක් සෑදීම

1. [supabase.com](https://supabase.com) වෙත ගොස් ඔබගේ GitHub account එකෙන් Sign in වන්න.
2. **New project** click කරන්න.
3. **Project Name** එකට නමක් දෙන්න (උදා: `nova-store`).
4. **Database Password** එකට හොඳ strong password එකක් ලබාදී එය වෙනම save කරගන්න (මතක තබාගන්න).
5. **Region** එක ලෙස **Singapore (ap-southeast-1)** තෝරන්න (ශ්‍රී ලංකාවට ආසන්නම සහ වේගවත්ම region එක).
6. **Create new project** click කර project එක සෑදෙන තුරු විනාඩි 1-2ක් රැඳී සිටින්න.

---

## 📌 පියවර 2: Database Tables සහ Data Setup කිරීම

Project root එකේ ඇති **`supabase-setup.sql`** file එක මඟින් අවශ්‍ය සියලුම tables 12 සහ products, variants, discount codes, reviews සියල්ලම එකවර සෑදේ.

1. Supabase dashboard එකේ වම් පැත්තේ menu එකෙන් **SQL Editor** වෙත යන්න.
2. **New query** click කරන්න.
3. මෙම project එකේ ඇති **`supabase-setup.sql`** file එක open කර එහි ඇති සියලුම code එක (Ctrl+A / Cmd+A) **Copy** කරගන්න.
4. Supabase SQL Editor එකට **Paste** කරන්න.
5. කොළ පාට **Run** button එක click කරන්න.
6. තත්පර 5-10කින් `Success. No rows returned` කියා පෙන්වයි.
7. වම් පැත්තේ **Table Editor** වෙත ගොස් `products`, `product_variants`, `collections`, `orders`, `customers` ඇතුළු tables 12ම සෑදී data ඇතුළත් වී ඇත්දැයි බලන්න.

---

## 📌 පියවර 3: Database Connection String එක ලබාගැනීම

1. Supabase dashboard එකේ ඉහළ ඇති **Connect** button එක click කරන්න (නැතහොත් **Project Settings → Database** වෙත යන්න).
2. **Connection string** යටතේ ඇති **URI** තෝරන්න.
3. Mode එක ලෙස **Session pooler** (Port `5432`) තෝරන්න.
   - *(Vercel හෝ වෙනත් IPv4 hosting සමඟ හොඳින්ම වැඩ කරන්නේ Session pooler එකයි)*.
4. URI එක Copy කරගන්න. එහි ආකෘතිය මෙසේ වේ:
   ```text
   postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
   ```
5. `[YOUR-PASSWORD]` ඇති තැනට පියවර 1දී ලබාදුන් database password එක දමන්න.
   - **විශේෂ අවධානය:** ඔබගේ password එකේ `@`, `#`, `$`, `%`, `:`, `?` වැනි special characters ඇත්නම්, ඒවා URL Encode කළ යුතුය (උදා: `@` වෙනුවට `%40`, `#` වෙනුවට `%23`).
6. Connection string එක අග `?sslmode=require` අනිවාර්යයෙන්ම තිබිය යුතුය.

---

## 📌 පියවර 4: Environment Variables සකස් කිරීම

Local පරිගණකයේදී `.env` file එකටද, Vercel/Hosting එකේදී **Environment Variables** වලටද පහත අගයන් ඇතුළත් කරන්න:

```env
# Supabase PostgreSQL Connection String
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[ENCODED_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"

# Admin Console Credentials (ඔබගේ කැමති email සහ password එකක් ලබාදෙන්න)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-strong-admin-password"

# Session Signing Secrets (අකුරු සහ ඉලක්කම් 32කට වඩා දිගු random keys දෙකක් ලබාදෙන්න)
ADMIN_SECRET="nova_admin_secret_key_random_long_string_2026"
CUSTOMER_SECRET="nova_customer_secret_key_random_long_string_2026"
```

> **සටහන:** `ADMIN_SECRET` සහ `CUSTOMER_SECRET` සඳහා random keys සාදාගැනීමට terminal එකේ `openssl rand -base64 32` run කළ හැක.

---

## 📌 පියවර 5: Vercel වෙත Deploy කිරීම

1. ඔබගේ code එක **GitHub Repository** එකකට push කරන්න.
2. [Vercel](https://vercel.com) වෙත ගොස් **Add New → Project** තෝරන්න.
3. ඔබගේ GitHub repo එක Import කරන්න.
4. **Environment Variables** section එකට ඉහත පියවර 4 හි සඳහන් variables 5ම ඇතුළත් කරන්න:
   - `DATABASE_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_SECRET`
   - `CUSTOMER_SECRET`
5. **Deploy** click කරන්න.

---

## 📌 පියවර 6: වෙබ් අඩවිය පරික්ෂා කිරීම (Testing & Login)

### 1. Storefront (පාරිභෝගිකයින්ට පෙනෙන කොටස)
- Home page එක (`/`) සහ Shop page එක (`/shop`) open කර products සහ filters නිවැරදිව load වෙනවාදැයි බලන්න.
- `/api/health` වෙත ගිය විට `{"ok":true}` ලැබේදැයි තහවුරු කරගන්න.

### 2. Store Management Console (Admin)
- Admin login පිටුවට යාමට URL එක අගට `/admin` ලෙස type කරන්න:
  ```text
  https://your-domain.com/admin
  ```
- ඔබ `.env` හි ලබාදුන් `ADMIN_EMAIL` සහ `ADMIN_PASSWORD` මඟින් Log in වන්න.
- Products add/edit කිරීම, stock matrix වෙනස් කිරීම, discount codes සෑදීම සහ orders බැලීම සිදුකළ හැක.

### 3. Customer Account (Demo Login)
- පාරිභෝගිකයින්ට account එකක් සෑදීමට හෝ පහත demo account එකෙන් sign in වීමට හැක:
  - **Email:** `client@nova.com`
  - **Password:** `nova1234`
- Active orders, order tracking timeline, wishlist සහ reviews බලාගත හැක.

### 4. Promo Codes (Checkout එකේදී test කිරීමට)
- `NOVAWELCOME` — 10% Off (Entire store)
- `FOOTWEAR20` — 20% Off (Footwear category)
- `ESSENTIAL25` — $25 Off (Essentials collection, min spend $300)

---

## 💡 වැදගත් කරුණු (Tips)

1. **Supabase Inactivity Pause:** Free tier එකේදී දින 7ක් database එකට request එකක් නොපැමිණියහොත් project එක pause වේ. එවිට Supabase dashboard වෙත ගොස් **Restore project** click කළ යුතුය (data නැති නොවේ).
2. **Security:** `supabase-setup.sql` මඟින් tables 12ටම Row Level Security (RLS) enable කර ඇත. එමනිසා server-side connection එක හරහා පමණක් ආරක්ෂිතව data කියවීම/ලිවීම සිදුවේ.
3. **Password Security:** පාරිභෝගික මුරපද `scrypt` hashing මඟින් encrypted කර database හි තැන්පත් වේ.
