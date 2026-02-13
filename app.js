/***********************
 * TutorPage WhatsApp + Lead submit (HARD VERSION)
 * - robust input access (NO leadForm.name bug)
 * - phone normalization (digits only)
 * - supports local 10-digit number -> +7...
 * - updates BOTH WhatsApp buttons (top + bottom)
 * - avoids popup blockers (uses location.href)
 * - shows debug logs if needed
 ************************/

// ====== SETTINGS ======
const BACKEND_URL = "http://127.0.0.1:8000/lead"; // keep if you use backend
const COUNTRY_CODE = "7"; // Kazakhstan/Russia
const WHATSAPP_LOCAL = "7759680249"; // your number WITHOUT +7 (10 digits)

// Compose to international format for wa.me
const WHATSAPP_NUMBER = `${COUNTRY_CODE}${WHATSAPP_LOCAL}`;

// If true -> console.log a lot
const DEBUG = false;

// ====== DOM ======
const leadForm = document.getElementById("leadForm");
const okMessage = document.getElementById("ok");
const waLink = document.getElementById("waLink");               // bottom link
const waNumber = document.getElementById("waNumber");           // shown number
const waButton = document.getElementById("whatsAppButton");     // form button

// ====== GUARDS ======
if (!leadForm || !waLink || !waNumber || !waButton) {
  console.error("TutorPage: Missing required elements in HTML.");
}

// Always access inputs safely
function getInputs() {
  const nameInput = leadForm?.elements?.["name"] || null;
  const phoneInput = leadForm?.elements?.["phone"] || null;
  return { nameInput, phoneInput };
}

// ====== HELPERS ======
function log(...args) {
  if (DEBUG) console.log("[TutorPage]", ...args);
}

// Keep only digits
function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Normalize user phone input to a readable string (for message)
 * Doesn’t need to be perfect. Just makes it clean.
 */
function normalizeUserPhone(raw) {
  const d = digitsOnly(raw);

  // If user typed 11 digits starting with 7 or 8, keep it
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return d;

  // If user typed local 10 digits, assume +7
  if (d.length === 10) return COUNTRY_CODE + d;

  // Otherwise return digits as-is
  return d;
}

/**
 * Build WhatsApp message and link
 */
function buildWhatsAppLink(name, userPhone) {
  const safeName = String(name || "").trim();
  const normalizedUserPhone = normalizeUserPhone(userPhone);

  const msgParts = [
    "Здравствуйте!",
    safeName ? `Меня зовут ${safeName}.` : "",
    normalizedUserPhone ? `Мой телефон: +${normalizedUserPhone}.` : "",
    "Я хочу записаться на занятия по английскому."
  ].filter(Boolean);

  const message = msgParts.join(" ");

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  log("WA url:", url);
  return url;
}

/**
 * Update UI links live
 */
function updateWhatsAppUI() {
  if (!leadForm) return;
  const { nameInput, phoneInput } = getInputs();
  if (!nameInput || !phoneInput) return;

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  // show tutor whatsapp in footer
  waNumber.textContent = `+${WHATSAPP_NUMBER}`;

  const link = buildWhatsAppLink(name, phone);
  waLink.href = link;
  waButton.dataset.link = link;
}

/**
 * Open WA in the most reliable way
 * Uses location.href (not window.open) => less blocking
 */
function openWhatsAppLink(link) {
  if (!link) return;
  window.location.href = link;
}

/**
 * Validate form fields
 */
function validateLead(name, phone) {
  const n = String(name || "").trim();
  const p = digitsOnly(phone);

  if (!n) return { ok: false, msg: "Введите имя." };
  if (!p) return { ok: false, msg: "Введите телефон." };

  // optional stricter checks:
  // allow 10 or 11+ digits
  if (p.length < 9) return { ok: false, msg: "Телефон слишком короткий." };

  return { ok: true, msg: "" };
}

// ====== INIT ======
updateWhatsAppUI();

if (leadForm) {
  const { nameInput, phoneInput } = getInputs();

  // Live update
  if (nameInput) nameInput.addEventListener("input", updateWhatsAppUI);
  if (phoneInput) phoneInput.addEventListener("input", updateWhatsAppUI);

  // WhatsApp button inside form
  waButton.addEventListener("click", () => {
    const { nameInput, phoneInput } = getInputs();
    const name = nameInput?.value || "";
    const phone = phoneInput?.value || "";

    const v = validateLead(name, phone);
    if (!v.ok) {
      alert(v.msg);
      return;
    }

    const link = waButton.dataset.link || buildWhatsAppLink(name, phone);
    openWhatsAppLink(link);
  });

  // Bottom WhatsApp link
  waLink.addEventListener("click", (e) => {
    e.preventDefault();
    const link = waLink.href || `https://wa.me/${WHATSAPP_NUMBER}`;
    openWhatsAppLink(link);
  });

  // Submit to backend (optional)
  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { nameInput, phoneInput } = getInputs();
    const name = (nameInput?.value || "").trim();
    const phone = (phoneInput?.value || "").trim();

    const v = validateLead(name, phone);
    if (!v.ok) {
      alert(v.msg);
      return;
    }

    // If you don't have backend running, comment next block
    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      if (!res.ok) throw new Error("Backend error");

      if (okMessage) okMessage.style.display = "block";
      leadForm.reset();
      updateWhatsAppUI();
    } catch (err) {
      // Fallback: still allow WA if backend fails
      alert("Не удалось отправить заявку на сервер. Попробуйте написать в WhatsApp 🙂");
      const fallbackLink = buildWhatsAppLink(name, phone);
      openWhatsAppLink(fallbackLink);
    }
  });
}
