import assert from "node:assert/strict";
import { z } from "zod";
import { encryptApiKey, decryptApiKey } from "../src/lib/ai/encryption";
import { validateCustomBaseUrl } from "../src/lib/ai/user-keys";
import { callAI } from "../src/lib/ai/adapter";
import { AiError } from "../src/lib/ai/types";

const originalFetch = globalThis.fetch;

async function runSelfChecks() {
  console.log("==================================================");
  console.log("CALORIE HUNTER AI - SELF-CHECK RUNNER (Task 1.8)");
  console.log("==================================================");

  // ---------------------------------------------------------------------------
  // TEST 1: Enkripsi Round-trip (AES-256-GCM)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 1] Enkripsi & Dekripsi AES-256-GCM Round-trip...");
  {
    const originalSecret = "sk-ant-api-key-live-super-secret-123456789";
    const encrypted = encryptApiKey(originalSecret);
    assert.notStrictEqual(encrypted, originalSecret, "Ciphertext tidak boleh sama dengan plaintext");
    assert.ok(encrypted.length > 32, "Panjang ciphertext base64 harus valid");

    const decrypted = decryptApiKey(encrypted);
    assert.strictEqual(decrypted, originalSecret, "Teks hasil dekripsi harus persis sama dengan plaintext");
    console.log("  ✓ PASS: Enkripsi & dekripsi round-trip berhasil diverifikasi.");
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Base URL privat ditolak (SSRF Defense)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 2] Validasi Base URL Kustom & Proteksi SSRF...");
  {
    const dangerousUrls = [
      "http://api.openai.com/v1", // Non-https
      "https://localhost:8080/v1", // Localhost
      "https://sub.localhost:3000", // Sub-localhost
      "https://127.0.0.1:8000/v1", // IPv4 loopback
      "https://10.0.0.1/v1", // Private RFC1918 Class A
      "https://192.168.1.1/v1", // Private RFC1918 Class C
      "https://172.16.0.1/v1", // Private RFC1918 Class B
      "https://172.31.255.255/v1", // Private RFC1918 Class B end
      "https://169.254.169.254/latest", // Link-local / Cloud metadata
      "https://metadata.google.internal/computeMetadata/v1", // GCP metadata
    ];

    for (const url of dangerousUrls) {
      const res = validateCustomBaseUrl(url);
      assert.strictEqual(res.valid, false, `URL berbahaya harus ditolak: ${url}`);
      assert.ok(res.error, `Pesan error harus tersedia untuk: ${url}`);
    }

    const safeUrls = [
      "https://api.openai.com/v1",
      "https://gateway.ai.cloudflare.com/v1/account/project/openai",
      "https://proxy.custom-domain.com/v1",
    ];
    for (const url of safeUrls) {
      const res = validateCustomBaseUrl(url);
      assert.strictEqual(res.valid, true, `URL publik valid harus diizinkan: ${url}`);
    }
    console.log("  ✓ PASS: Seluruh URL privat/localhost/link-local berhasil ditolak.");
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Foto + model tanpa vision -> AI_MODEL_NO_VISION (tanpa panggil API)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 3] Foto + Model Tanpa Vision -> AI_MODEL_NO_VISION...");
  {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response("OK", { status: 200 });
    };

    let caughtError: AiError | null = null;
    try {
      await callAI({
        provider: "deepseek",
        model: "deepseek-v4-flash", // Non-vision model
        apiKey: "test-deepseek-key-1234",
        messages: [{ role: "user", content: "Analisis foto ini" }],
        image: {
          base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          mimeType: "image/png",
        },
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert.strictEqual(fetchCalled, false, "API TIDAK BOLEH dipanggil jika model tidak mendukung vision");
    assert.ok(caughtError instanceof AiError, "Harus melempar AiError");
    assert.strictEqual(caughtError.code, "AI_MODEL_NO_VISION");
    console.log("  ✓ PASS: Model non-vision langsung diblokir sebelum pemanggilan fetch.");
  }

  // ---------------------------------------------------------------------------
  // TEST 4: HTTP 429 -> Retry 1x lalu AI_RATE_LIMITED
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 4] HTTP 429 -> Retry 1x lalu AI_RATE_LIMITED...");
  {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "1" },
      });
    };

    let caughtError: AiError | null = null;
    try {
      await callAI({
        provider: "openai",
        model: "gpt-5.6-luna",
        apiKey: "sk-test-key-1234",
        messages: [{ role: "user", content: "Tes kuota" }],
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert.strictEqual(fetchCount, 2, "Harus melakukan tepat 1x retry (total 2 panggilan fetch)");
    assert.ok(caughtError instanceof AiError, "Harus melempar AiError");
    assert.strictEqual(caughtError.code, "AI_RATE_LIMITED");
    console.log("  ✓ PASS: HTTP 429 berhasil di-retry 1x dan menghasilkan AI_RATE_LIMITED.");
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Timeout / Abort -> AI_TIMEOUT
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 5] Timeout / AbortController -> AI_TIMEOUT...");
  {
    globalThis.fetch = async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    };

    let caughtError: AiError | null = null;
    try {
      await callAI({
        provider: "gemini",
        model: "gemini-3.8-flash",
        apiKey: "test-gemini-key-1234",
        messages: [{ role: "user", content: "Tes timeout" }],
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert.ok(caughtError instanceof AiError, "Harus melempar AiError");
    assert.strictEqual(caughtError.code, "AI_TIMEOUT");
    console.log("  ✓ PASS: Abort/timeout berhasil ditangkap sebagai AI_TIMEOUT.");
  }

  // ---------------------------------------------------------------------------
  // TEST 6: JSON rusak -> 1x perbaikan lalu AI_BAD_OUTPUT
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 6] JSON Rusak -> 1x Repair lalu AI_BAD_OUTPUT...");
  {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      // Selalu kembalikan respons teks yang bukan JSON valid
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Maaf saya tidak bisa menghasilkan format JSON { rusak total",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const dummySchema = z.object({
      calories: z.number(),
    });

    let caughtError: AiError | null = null;
    try {
      await callAI({
        provider: "openai",
        model: "gpt-5.6-luna",
        apiKey: "test-openai-key-9999",
        messages: [{ role: "user", content: "Kembalikan JSON kalori" }],
        schema: dummySchema,
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert.strictEqual(fetchCount, 2, "Harus melakukan tepat 1x repair call ke model");
    assert.ok(caughtError instanceof AiError, "Harus melempar AiError");
    assert.strictEqual(caughtError.code, "AI_BAD_OUTPUT");
    console.log("  ✓ PASS: Respons JSON rusak memicu 1x repair lalu menghasilkan AI_BAD_OUTPUT.");
  }

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log("\n==================================================");
  console.log("SEMUA 6/6 PENGUJIAN SELF-CHECK LULUS DENGAN SUKSES!");
  console.log("==================================================");
}

runSelfChecks().catch((err) => {
  globalThis.fetch = originalFetch;
  console.error("\n❌ SELF-CHECK GAGAL:", err);
  process.exit(1);
});
