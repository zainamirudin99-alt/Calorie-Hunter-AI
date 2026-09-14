# Panduan Database Supabase — Calorie Hunter AI

Dokumen ini berisi instruksi eksekusi skema database PostgreSQL untuk proyek **Calorie Hunter AI**.

## 1. Menjalankan Migrasi Skema di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan pilih project Anda.
2. Buka tab **SQL Editor** (ikon `>_` di sidebar kiri).
3. Klik **"New Query"**.
4. Buka file [supabase/migrations/0001_initial_schema.sql](file:///c:/Users/LENOVO/Documents/Zain%202.0/Project%20AI/Calorie%20Hunter%20AI/supabase/migrations/0001_initial_schema.sql), salin seluruh isinya, dan tempelkan ke editor SQL Supabase.
5. Klik tombol **"Run"** (atau tekan `Ctrl + Enter`).

## 2. Tabel yang Dibuat & Invariant yang Ditegakkan

| Tabel | Deskripsi | Invariant Kunci |
|---|---|---|
| `profiles` | Data diri pengguna (usia, TB, BB, gender, PAL) | `lower(username)` unik; `height_cm > 0`, `weight_kg > 0`, `age` 10–100 |
| `weekly_activities` | Daftar aktivitas kustom pengguna | `frequency_per_week` 0–7; `duration_minutes > 0` |
| `weight_logs` | Catatan riwayat berat badan | `weight_kg > 0` |
| `programs` | Program aktif (Cutting, Bulking, Maintenance) | **Hanya 1 active program** per user (`idx_single_active_program_per_user`) |
| `meal_plans` | Rencana makan mingguan terstruktur dari Gemini | Disimpan sebagai JSONB |
| `food_logs` | Log konsumsi makanan | **XOR**: tepat satu dari `photo_url` atau `raw_text_input` |
| `food_log_items` | Breakdown makro/mikro per item makanan | `weight_g > 0`, `calories_kcal >= 0` |

## 3. Row Level Security (RLS)

Seluruh 7 tabel memiliki RLS yang aktif:
- Pengguna hanya dapat mengakses dan memodifikasi datanya sendiri via `auth.uid() = user_id`.
- Data pengguna lain dijamin aman dan terisolasi secara kriptografis di level database engine.

## 4. Storage Bucket: `food-photos`

Skrip migrasi secara otomatis:
1. Membuat storage bucket `food-photos` dengan status **Private**.
2. Menerapkan security policy agar setiap user hanya dapat mengunggah dan melihat foto makanan pada foldernya masing-masing: `food-photos/{user_id}/*`.
