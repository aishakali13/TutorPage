const BACKEND_URL = "http://127.0.0.1:8000/lead";

const COUNTRY_CODE = "7";
const WHATSAPP_LOCAL = "7759680249";
const WHATSAPP_NUMBER = `${COUNTRY_CODE}${WHATSAPP_LOCAL}`;

const DEBUG = false;

const leadForm = document.getElementById("leadForm");
const okMessage = document.getElementById("ok");
const waLink = document.getElementById("waLink");
const waNumber = document.getElementById("waNumber");
const waButton = document.getElementById("whatsAppButton");

if (!leadForm || !waLink || !waNumber || !waButton) {
  console.error("TutorPage: Missing required elements in HTML.");
}

function log(...args) {
  if (DEBUG) console.log("[TutorPage]", ...args);
}

function getInputs() {
  const nameInput = leadForm?.elements?.["name"] || null;
  const phoneInput = leadForm?.elements?.["phone"] || null;
  return { nameInput, phoneInput };
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeUserPhone(raw) {
  const d = digitsOnly(raw);

 
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return d;

  
  if (d.length === 10) return COUNTRY_CODE + d;


  return d;
}

function buildWhatsAppLink(name, userPhone) {
  const safeName = String(name || "").trim();
  const normalizedUserPhone = normalizeUserPhone(userPhone);

  const msgParts = [
    "Здравствуйте!",
    safeName ? `Меня зовут ${safeName}.` : "",
    normalizedUserPhone ? `Мой телефон: +${normalizedUserPhone}.` : "",
    "Я хочу записаться на занятия по английскому.",
  ].filter(Boolean);

  const message = msgParts.join(" ");
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  log("WA url:", url);
  return url;
}

function updateWhatsAppUI() {
  if (!leadForm) return;

  const { nameInput, phoneInput } = getInputs();
  if (!nameInput || !phoneInput) return;

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  waNumber.textContent = `+${WHATSAPP_NUMBER}`;

  const link = buildWhatsAppLink(name, phone);
  waLink.href = link;
  waButton.dataset.link = link;
}

function openWhatsAppLink(link) {
  if (!link) return;
  window.location.href = link;
}

function validateLead(name, phone) {
  const n = String(name || "").trim();
  const p = digitsOnly(phone);

  if (!n) return { ok: false, msg: "Введите имя." };
  if (!p) return { ok: false, msg: "Введите телефон." };

  if (p.length < 9) return { ok: false, msg: "Телефон слишком короткий." };

  return { ok: true, msg: "" };
}


updateWhatsAppUI();

if (leadForm) {
  const { nameInput, phoneInput } = getInputs();

  if (nameInput) nameInput.addEventListener("input", updateWhatsAppUI);
  if (phoneInput) phoneInput.addEventListener("input", updateWhatsAppUI);

  
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

  
  waLink.addEventListener("click", (e) => {
    e.preventDefault();
    const link = waLink.href || `https://wa.me/${WHATSAPP_NUMBER}`;
    openWhatsAppLink(link);
  });


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

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status}`);
      }

      if (okMessage) okMessage.style.display = "block";

      leadForm.reset();
      updateWhatsAppUI();
      return;
    } catch (_err) {
      console.error("Lead send failed:", _err);

      alert("Не удалось отправить заявку на сервер. Попробуйте написать в WhatsApp 🙂");
      const fallbackLink = buildWhatsAppLink(name, phone);
      openWhatsAppLink(fallbackLink);
    }
  });
}

