# SMARTPROMPT — Calorie Hunter AI

> **Cara pakai:** Ini satu dokumen spesifikasi lengkap sekaligus prompt siap-tempel. Buka Antigravity IDE, buat project baru, lalu tempelkan seluruh isi dokumen ini (atau simpan sebagai `SOURCE_OF_TRUTH.md` di root repo) sebagai instruksi awal ke agent (Gemini 3.8 Flash). Minta agent mengerjakan **satu Fase pada satu waktu** (lihat §7), bukan sekaligus semua — ini membuat setiap langkah kecil, bisa direview, dan bisa di-*revert*.

Metodologi penyusunan: domain model & invariant dulu (arsitektur) → keputusan berat dikunci lebih dulu dengan analisis tradeoff (dewan) → tiap keputusan dibangun ke versi paling minim yang tetap benar (ponytail) → checklist review tertanam di §9–§11 sebelum kode dianggap "selesai".

---

## 0. Ringkasan

**Nama:** Calorie Hunter AI — penghitung kalori harian berbasis TDEE dengan bantuan AI.
**Stack:** Next.js (Vercel) + Supabase (Postgres, Auth, Storage) + Gemini API (`gemini-3.8-flash`, lewat Google AI Studio, tier gratis) + dikerjakan di Google Antigravity IDE.

**Ground truth yang sudah diverifikasi (per 14 Sep 2026) — cek ulang bila sudah lama dari tanggal ini:**
| Fakta | Nilai | Sumber untuk verifikasi ulang |
|---|---|---|
| Model ID Gemini yang diminta | `gemini-3.8-flash` — GA, multimodal (teks+gambar), context window 1M token, mendukung structured JSON output | `ai.google.dev/gemini-api/docs/models` |
| SDK resmi Node/TS | `@google/genai` (bukan `@google/generative-ai` yang sudah lama/legacy) | `npm i @google/genai`, docs di `googleapis.github.io/js-genai` |
| Antigravity IDE | Agentic IDE dari Google (fork VS Code), agent default-nya memang memakai `gemini-3.8-flash` | `ai.google.dev` / halaman produk Antigravity |
| Tier gratis Gemini API | Ada, tapi rate-limited (RPM/RPD kecil) dan historinya hanya mencakup lini "Flash" — **belum pasti `gemini-3.8-flash` (baru rilis 2 Sep 2026) sudah masuk daftar gratis saat kamu membaca ini.** Cek di AI Studio → API Keys → Rate Limits. Siapkan fallback ke `gemini-2.5-flash` bila belum. | `aistudio.google.com` |
| Supabase Auth | **Tidak** punya field "username" bawaan — hanya email/phone. Pola umum: email sintetis. | `supabase.com/docs/guides/auth` |

> Agent: jangan menganggap tabel di atas berlaku selamanya — kalau API/paket berubah saat implementasi, ikuti dokumentasi resmi terbaru, bukan angka di atas.

---

## 1. Keputusan Arsitektur Kunci (mini-ADR)

Lima keputusan ini fondasional (sulit diubah belakangan) — dikunci dulu sebelum kode ditulis, dengan tradeoff eksplisit:

| # | Keputusan | Kenapa | Alternatif yang ditolak |
|---|---|---|---|
| ADR-1 | Login pakai **username+password** di atas **Supabase Auth email/password**, dengan email sintetis deterministik `{username_lowercase}@chai.local` + "confirm email" **dimatikan** di project settings | Supabase Auth sudah teraudit, gratis, dan menangani hashing/JWT/refresh token dengan benar. Trust boundary (auth) bukan tempat untuk hemat kerja | Bikin sistem auth sendiri (hash manual + JWT sendiri) — reinventing the wheel di titik paling berisiko |
| ADR-2 | **BMR/TDEE dihitung deterministik di server** (formula Mifflin-St Jeor), **bukan** lewat panggilan Gemini | LLM tidak reliable untuk aritmatika presisi (risiko halusinasi angka), lebih lambat, dan boros kuota gratis untuk hal yang punya rumus pasti. AI dipakai untuk yang memang butuh penalaran: racikan menu & baca foto makanan | Minta Gemini "menghitung" TDEE langsung dari prompt teks |
| ADR-3 | Semua panggilan Gemini **hanya dari server** (Next.js Route Handler), API key disimpan di **Vercel Environment Variable**, tidak pernah dikirim ke client | Kunci API yang bocor di bundle client bisa disedot orang lain — kuota gratis habis dalam hitungan menit. Ini konsisten dengan peringatan resmi SDK: *"Avoid exposing API keys in client-side code"* | Panggil Gemini langsung dari browser (lebih "simpel" tapi membuka kunci ke publik) |
| ADR-4 | Hasil analisis gizi AI disimpan **ternormalisasi** di tabel `food_log_items` (satu baris per item makanan) + JSON mentah tetap disimpan di `food_logs.ai_response_json` untuk audit | Dashboard butuh agregasi cepat (SUM/AVG per hari/minggu) — JSON blob saja menyulitkan query; tapi memaksa tiap vitamin jadi kolom sendiri berlebihan, jadi mikro-nutrisi tetap JSONB di level item | Simpan JSON saja (query lambat) atau kolom kaku per-vitamin (terlalu rigid) |
| ADR-5 | Wajib isi ulang berat badan tiap 6 bulan **ditegakkan sistem**: Vercel Cron harian menandai `programs.status = 'expired'` saat `end_date` lewat, lalu UI mengunci menu Tracking sampai `weight_logs` baru + program baru dipilih | Kata "wajib" di requirement berarti tidak boleh cuma mengandalkan user ingat sendiri — harus ada gate teknis | Reminder pasif (notifikasi/banner) tanpa penguncian akses |

---

## 2. Model Domain & Invariant (Source of Truth)

**Non-goals (di luar cakupan v1):** login sosial (Google/Apple), multi-bahasa, mode offline, resep custom oleh user, integrasi wearable/fitness tracker.

### 2.1 Skema tabel (Postgres/Supabase)

| Tabel | Kolom penting | Constraint / Invariant | Ditegakkan di |
|---|---|---|---|
| `profiles` | `id uuid PK = auth.users.id`, `username text`, `full_name`, `gender enum('male','female')`, `age int`, `height_cm numeric`, `weight_kg numeric`, `activity_level enum(...)`, `created_at` | `username` unik (case-insensitive: `unique index on lower(username)`); `height_cm>0`, `weight_kg>0`, `age between 10 and 100` (CHECK) | App (form validation, zod) **dan** DB (unique index + CHECK) |
| `weekly_activities` | `id`, `user_id FK→auth.users`, `activity_name text` (input bebas via tombol tambah), `frequency_per_week int`, `duration_minutes int`, `intensity enum('low','moderate','high')` | `frequency_per_week between 0 and 7`; `duration_minutes>0`; cascade delete saat user dihapus | App + DB CHECK |
| `weight_logs` | `id`, `user_id`, `weight_kg`, `logged_at`, `note` | `weight_kg>0`; minimal 1 baris wajib ada sebelum `programs` baru dibuat | App (blokir submit) + DB CHECK numerik |
| `programs` | `id`, `user_id`, `tdee_base numeric` (snapshot), `program_type enum('cutting','bulking','maintenance')`, `target_daily_kcal numeric`, `start_date`, `end_date` (= `start_date + interval '6 months'`), `status enum('active','expired','superseded')` | **Hanya satu `active` per user** → partial unique index `WHERE status='active'` | DB (partial unique index) + App (nonaktifkan yang lama sebelum insert baru) |
| `meal_plans` | `id`, `program_id FK`, `week_start_date`, `plan_json jsonb`, `generated_at`, `model_used text` | `plan_json` harus lolos validasi schema sebelum disimpan (tolak & retry jika Gemini keluar dari schema) | App (validasi Zod/JSON-schema sebelum insert) |
| `food_logs` | `id`, `user_id`, `program_id`, `logged_at`, `input_type enum('photo','manual_text')`, `photo_url`, `raw_text_input`, `ai_response_json jsonb`, `total_kcal numeric` | **XOR**: tepat satu dari `photo_url`/`raw_text_input` terisi | DB CHECK `(photo_url IS NOT NULL) <> (raw_text_input IS NOT NULL)` + App (tombol "Proses" nonaktif sampai salah satu diisi) |
| `food_log_items` | `id`, `food_log_id FK`, `food_name`, `weight_g`, `calories_kcal`, `carbs_g`, `protein_g`, `fat_g`, `fiber_g`, `sugar_g`, `micros_json jsonb` (natrium, vitamin, dll — bervariasi per makanan), `pct_of_daily_kcal numeric` | `weight_g>0`, `calories_kcal>=0` | DB CHECK |

Semua tabel: **RLS aktif**, kolom `user_id` (langsung, bukan lewat join) + policy `USING (auth.uid() = user_id)` — pilihan sengaja demi RLS yang sederhana & cepat, bukan lewat join ke `profiles`.

### 2.2 Asumsi & pertanyaan terbuka (konfirmasi ke user sebelum/at Fase 3 & 4)

1. "Aktivitas dalam seminggu" di form data diri diasumsikan = pilihan **level PAL standar** (Sedentary/Ringan/Sedang/Aktif/Sangat Aktif) yang jadi pengali dasar TDEE. Daftar hobi kustom (tombol tambah) dipakai sebagai **konteks tambahan untuk AI** saat racik menu — bukan pengganti PAL. Kalau maksudnya lain, sesuaikan §4.3.
2. Persentase defisit/surplus kalori (Cutting −20%, Bulking +15%, Maintenance 0%) adalah default umum gizi olahraga, bukan angka medis pasti — boleh dijadikan konstanta yang mudah diubah, bukan di-hardcode di banyak tempat.
3. Ketersediaan `gemini-3.8-flash` di tier gratis perlu dicek langsung saat implementasi (lihat tabel ground truth §0).
4. "6 bulan" dihitung dari `programs.start_date`, bukan dari tanggal registrasi akun.

---

## 3. Tech Stack

| Layer | Teknologi | Peran |
|---|---|---|
| Frontend | Next.js 15+ (App Router, TypeScript) + Tailwind CSS + shadcn/ui | UI web responsif desktop & mobile dalam satu codebase |
| Chart | `recharts` | Grafik dashboard (jangan bikin chart engine sendiri) |
| Hosting | Vercel | Deploy Next.js + Vercel Cron untuk job harian |
| Database & Auth & Storage | Supabase (Postgres + Row Level Security + Auth + Storage) | Data user, sesi login, penyimpanan foto makanan |
| AI | Gemini API (`gemini-3.8-flash`) via `@google/genai`, dipanggil hanya dari server | Analisis foto/teks makanan, generate rencana makan mingguan |
| Dev environment | Google Antigravity IDE | Tempat agent (Gemini 3.8 Flash) menulis & menjalankan kode |

**Environment variables (server-only kecuali yang ditandai publik):**
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publik, aman — dibatasi RLS), `SUPABASE_SERVICE_ROLE_KEY` (server-only, dipakai hanya di Route Handler untuk operasi admin seperti `signUp` dengan email sintetis), `GEMINI_API_KEY` (server-only).

---

## 4. Alur Pengguna End-to-End

1. **Registrasi**: username + password (+ konfirmasi password) → tanpa email nyata.
2. **Login**: username + password.
3. **Isi data diri**: nama, tinggi (cm), berat (kg), usia, jenis kelamin, level aktivitas mingguan (PAL).
4. **Isi hobi/aktivitas mingguan**: list dengan tombol **"+ Tambah Aktivitas"** → input bebas nama aktivitas, frekuensi/minggu, durasi, intensitas.
5. Sistem **menghitung TDEE otomatis** (deterministik, lihat §6.1) dan menampilkannya.
6. User **memilih program**: Cutting / Bulking / Maintenance → sistem hitung `target_daily_kcal`.
7. AI **membuat rencana makan mingguan** untuk ~1 bulan ke depan (regenerasi tiap awal bulan selama program masih aktif).
8. **Tracking Kalori**: user pilih mode **foto** atau **teks manual** → klik **"Proses"** → AI mengidentifikasi jenis makanan + berat (gram) + breakdown makro/mikro + persentase → tersimpan otomatis, sisa kalori harian ter-update real-time.
9. **Dashboard**: grafik kalori harian vs target, tren berat badan, breakdown makro mingguan.
10. Setelah **180 hari** dari `start_date` program aktif: sistem mengunci menu Tracking, memaksa input `weight_logs` baru → hitung ulang TDEE → pilih program baru → kembali ke langkah 7.

---

## 5. Kontrak API (Route Handlers Next.js)

| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/api/auth/register` | POST | – | `{username, password}` → derive email sintetis → `supabase.auth.signUp` (service role) → insert `profiles` |
| `/api/auth/login` | POST | – | `{username, password}` → derive email sintetis → `signInWithPassword` |
| `/api/profile` | POST/PATCH | user | Upsert data diri |
| `/api/activities` | POST/DELETE | user | CRUD `weekly_activities` |
| `/api/tdee/calculate` | POST | user | **Deterministik** (bukan LLM) — hitung BMR×PAL, kembalikan `tdee_base` |
| `/api/programs` | POST | user | `{program_type}` → hitung `target_daily_kcal`, nonaktifkan program lama, insert baru, trigger generate meal plan |
| `/api/meal-plan/generate` | POST (internal) | user | Panggil Gemini → validasi schema → simpan `meal_plans` |
| `/api/food-log` | POST (multipart) | user | Upload foto ATAU teks → panggil Gemini multimodal → simpan `food_logs` + `food_log_items` → kembalikan sisa budget kalori |
| `/api/dashboard/summary` | GET | user | Data teragregasi untuk grafik |
| `/api/cron/reassessment-check` | GET (Vercel Cron, harian) | cron secret | Cek `programs.end_date` lewat → set `expired` |

---

## 6. Integrasi AI Gemini

### 6.1 Kalkulasi TDEE (deterministik — tulis sebagai fungsi biasa, bukan prompt)

```
BMR (pria)  = 10×berat_kg + 6.25×tinggi_cm − 5×usia + 5
BMR (wanita)= 10×berat_kg + 6.25×tinggi_cm − 5×usia − 161

Faktor PAL: Sedentary=1.2, Ringan=1.375, Sedang=1.55, Aktif=1.725, Sangat Aktif=1.9
TDEE = BMR × Faktor_PAL

Target kalori:
  Cutting     = TDEE × 0.8   (jangan sampai di bawah BMR — clamp minimum = BMR)
  Bulking     = TDEE × 1.15
  Maintenance = TDEE × 1.0
```
Tampilkan disclaimer kecil di UI: bukan pengganti konsultasi ahli gizi/dokter, terutama untuk kondisi kesehatan khusus.

### 6.2 Analisis foto/teks makanan (Gemini multimodal, server-side)

Minta **structured output JSON** (via `responseSchema`/`responseMimeType: application/json` — cek nama parameter persis di dokumentasi `@google/genai` saat implementasi). Contoh bentuk skema:

```json
{
  "items": [
    {
      "food_name": "string",
      "estimated_weight_g": 0,
      "calories_kcal": 0,
      "macros": { "carbs_g": 0, "protein_g": 0, "fat_g": 0, "fiber_g": 0, "sugar_g": 0 },
      "micros": { "sodium_mg": 0, "potassium_mg": 0, "vitamin_c_mg": 0 },
      "confidence": 0.0
    }
  ],
  "total_calories_kcal": 0,
  "notes": "asumsi porsi/ukuran bila estimasi"
}
```
Instruksi prompt inti: *"Identifikasi setiap jenis makanan pada gambar/teks ini, estimasikan berat dalam gram, lalu hitung kalori dan kandungan makro+mikro nutrisinya. Jika ragu, tetap beri estimasi terbaik dan tandai confidence rendah — jangan mengosongkan field."*

### 6.3 Generate rencana makan mingguan

Input ke Gemini: profil (tinggi/berat/usia/gender), `target_daily_kcal`, `program_type`, daftar `weekly_activities` (untuk konteks, mis. lebih banyak protein bila ada aktivitas angkat beban). Output JSON: menu per hari selama 7 hari, tiap hari berisi beberapa waktu makan dengan estimasi kalori & makro, total mendekati `target_daily_kcal`. Regenerasi otomatis tiap awal bulan selama program masih `active`.

---

## 7. Rencana Eksekusi Bertahap

Kerjakan **satu fase per commit/PR**, jangan lompat fase.

| Fase | Fokus | Output utama |
|---|---|---|
| 0 | Setup | Init Next.js+Tailwind+shadcn di Vercel; project Supabase (Auth email/password, confirm-email OFF, bucket `food-photos` private); migrasi skema §2.1 + RLS; env vars §3 |
| 1 | Auth & Profil | Register/login username+password (email sintetis); form data diri |
| 2 | Aktivitas mingguan | List + tombol tambah aktivitas custom |
| 3 | TDEE & Program | Endpoint deterministik §6.1; UI pilih Cutting/Bulking/Maintenance |
| 4 | Meal plan AI | Endpoint §6.3; simpan & tampilkan rencana makan mingguan |
| 5 | Tracking kalori | Upload foto (`capture="environment"` utk mobile) / input manual → §6.2 → update sisa budget harian |
| 6 | Dashboard | Grafik (recharts): kalori vs target, tren berat, breakdown makro |
| 7 | Reassessment 6 bulan | Vercel Cron §5 + kunci UI Tracking sampai weight_log & program baru |
| 8 | Responsif & polish | Breakpoint mobile/tablet/desktop, rate-limit endpoint Gemini per user, error/loading state saat Gemini gagal atau keluar dari schema |

---

## 8. Aturan untuk Agent (Antigravity + Gemini 3.8 Flash)

- **Grounding**: jangan mengarang nama API/paket/parameter. Kalau ragu soal detail `@google/genai` atau Supabase, cek dokumentasi resmi dulu; kalau tidak yakin, tulis asumsi eksplisit di komentar kode, jangan menebak diam-diam.
- **Efisiensi**: kode dulu, penjelasan singkat setelahnya (maks beberapa baris per fase) — bukan esai desain di setiap commit.
- **Ponytail (jangan over-engineer)**: pakai Supabase Auth (bukan auth kustom), shadcn/ui (bukan design system sendiri), recharts (bukan chart engine sendiri), 1 Next.js app (bukan microservices). Kalau butuh abstraksi baru dengan 1 pemakai, jangan buat dulu.
- **Trust boundary = tidak boleh malas**: RLS wajib aktif di semua tabel; `GEMINI_API_KEY` & `SUPABASE_SERVICE_ROLE_KEY` tidak pernah menyentuh kode/bundle client; validasi input di form **dan** di route handler (dua lapis, bukan cuma di frontend).
- **Disiplin kerja**: baca file yang ada sebelum edit; perubahan kecil & bisa di-revert per fase; kalau ambigu/terblokir (mis. skema Gemini tidak sesuai ekspektasi), laporkan dan tanya — jangan menebak lalu jalan terus di area yang menyangkut uang/keamanan/data kesehatan pengguna.
- **Git**: 1 branch per fase, conventional commits (`feat:`, `fix:`, dst), commit atas nama pemilik repo saja — jangan menambahkan co-author AI atau menyebut AI di pesan commit.

---

## 9. Kriteria Selesai (per fase, harus lolos sebelum lanjut fase berikutnya)

- [ ] Register/login berhasil tanpa email nyata pernah terlihat di UI.
- [ ] Angka TDEE yang ditampilkan cocok (±1 kcal, toleransi pembulatan) dengan hitungan manual rumus Mifflin-St Jeor.
- [ ] Memilih salah satu dari 3 program menghasilkan `target_daily_kcal` yang benar dan rencana makan mingguan otomatis muncul.
- [ ] Upload foto ATAU input teks makanan → setelah klik Proses, muncul breakdown kalori+makro+mikro per item dengan persentase, tersimpan di DB, dan sisa kalori harian ter-update.
- [ ] Dashboard menampilkan minimal 3 grafik: kalori vs target, tren berat, breakdown makro.
- [ ] 180 hari setelah `start_date` program aktif, menu Tracking terkunci sampai user isi berat badan baru & pilih program baru.
- [ ] Tampilan tidak rusak/overflow pada lebar layar ≥1280px maupun ≤430px.
- [ ] `next build` lalu inspeksi bundle client: tidak ada `GEMINI_API_KEY` atau `SUPABASE_SERVICE_ROLE_KEY` yang bocor.
- [ ] Mencoba mengakses data user lain lewat API (user berbeda) harus ditolak oleh RLS.

---

## 10. Yang Perlu Dikonfirmasi Pengguna

Sebelum atau selama Fase 3–4, konfirmasikan 4 poin di §2.2 — semuanya sudah diberi default yang masuk akal di dokumen ini supaya agent tidak perlu berhenti menunggu jawaban, tapi ubah konstantanya kalau maksudmu berbeda.
