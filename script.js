const DEFAULT_START_DATE = "2024-06-14";
const STORAGE_KEY = "hekayetna-photos-v1";
const DATE_STORAGE_KEY = "hekayetna-start-date-v1";
const SETTINGS_STORAGE_KEY = "hekayetna-settings-v1";
const AVATARS_STORAGE_KEY = "hekayetna-avatars-v1";
const CHAT_STORAGE_KEY = "hekayetna-chat-v1";
const PASSWORD_STORAGE_KEY = "hekayetna-access-lock-v1";
const PRESENCE_STORAGE_KEY = "hekayetna-presence-v1";
const COMPLIMENT_INDEX_KEY = "hekayetna-compliment-index-v1";
const THEME_NAMES = ["blue", "sky", "lavender", "pink"];
const AVATAR_COLORS = {
  skin: ["#f7d5bc", "#e9b893", "#cf936f", "#a96f51", "#754d3d"],
  hair: ["#342721", "#654232", "#986044", "#c18b50", "#413f52", "#24252c"],
  shirt: ["#70b9eb", "#798de2", "#f18db0", "#78bd9a", "#e6a35c", "#806eb2"]
};
const DEFAULT_SETTINGS = {
  siteName: "حكايتنا.",
  heroBadge: "لحدّك إنتِ.. ومن قلبي",
  headline: "في حاجات كتير حلوة في الدنيا، بس إنتِ أحلاهم.",
  description: "عملتلك حتة صغيرة هنا.. فيها ضحكتنا، شوية لعب، وكلام نفسي أقولهولك كل يوم.",
  letter: "في كلام مبيتقالش غير لما تبقي هنا.",
  theme: "blue",
  startDate: DEFAULT_START_DATE,
  coverPhoto: ""
};
const DEFAULT_AVATARS = {
  you: { name: "أنا", skin: "#e9b893", hair: "#513b34", shirt: "#6baee5", style: "short", glasses: false, photo: "" },
  partner: { name: "حبيبتي", skin: "#f7d5bc", hair: "#342721", shirt: "#e88bae", style: "long", glasses: false, photo: "" }
};

const byId = (id) => document.getElementById(id);
const modal = byId("modal");
const modalContent = byId("modal-content");
let lastFocusedElement = null;
let toastTimeout;
let activeChatSender = "you";
let currentPresence = null;

function readStoredValue(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.error(`تعذّرت قراءة البيانات المحفوظة (${key}):`, error);
    showToast("في بيانات محفوظة ماقدرتش أفتحها على الجهاز ده.");
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`تعذّر حفظ البيانات (${key}):`, error);
    showToast("المساحة المحفوظة على الجهاز مش كفاية للتعديل ده.");
    return false;
  }
}

const savedSettings = readStoredValue(SETTINGS_STORAGE_KEY, {});
const appSettings = { ...DEFAULT_SETTINGS, ...(savedSettings && typeof savedSettings === "object" ? savedSettings : {}) };
if (!savedSettings || typeof savedSettings !== "object" || !Object.hasOwn(savedSettings, "startDate")) {
  try {
    appSettings.startDate = localStorage.getItem(DATE_STORAGE_KEY) || appSettings.startDate;
  } catch (error) {
    console.error("تعذّر ترحيل تاريخ بداية الحكاية المحفوظ:", error);
  }
}
for (const field of ["siteName", "heroBadge", "headline", "description", "letter"]) {
  if (typeof appSettings[field] !== "string") appSettings[field] = DEFAULT_SETTINGS[field];
}
if (typeof appSettings.coverPhoto !== "string") appSettings.coverPhoto = "";
const parsedStartDate = new Date(`${appSettings.startDate}T12:00:00`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(appSettings.startDate) || Number.isNaN(parsedStartDate.getTime()) || parsedStartDate > new Date()) {
  appSettings.startDate = DEFAULT_START_DATE;
}
appSettings.theme = THEME_NAMES.includes(appSettings.theme) ? appSettings.theme : "blue";
appSettings.startDate = typeof appSettings.startDate === "string" ? appSettings.startDate : DEFAULT_START_DATE;
const savedAvatars = readStoredValue(AVATARS_STORAGE_KEY, {});
const avatars = {};
for (const person of ["you", "partner"]) {
  const saved = savedAvatars && typeof savedAvatars === "object" ? savedAvatars[person] : null;
  const merged = { ...DEFAULT_AVATARS[person], ...(saved && typeof saved === "object" ? saved : {}) };
  for (const field of ["skin", "hair", "shirt"]) {
    if (!AVATAR_COLORS[field].includes(merged[field])) merged[field] = DEFAULT_AVATARS[person][field];
  }
  if (!["short", "long", "curly"].includes(merged.style)) merged.style = "short";
  merged.glasses = Boolean(merged.glasses);
  avatars[person] = merged;
}

function readStartDate() {
  const savedDate = appSettings.startDate || DEFAULT_START_DATE;
  const date = new Date(`${savedDate}T12:00:00`);
  if (!Number.isNaN(date.getTime())) return date;
  console.error("تاريخ بداية الحكاية المحفوظ غير صالح.");
  return new Date(`${DEFAULT_START_DATE}T12:00:00`);
}

let LOVE_START_DATE = readStartDate();

function updateCounter() {
  const now = new Date();
  let elapsed = Math.max(0, now.getTime() - LOVE_START_DATE.getTime());
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;
  const days = Math.floor(elapsed / day);
  elapsed %= day;
  const hours = Math.floor(elapsed / hour);
  elapsed %= hour;
  const minutes = Math.floor(elapsed / minute);
  const seconds = Math.floor((elapsed % minute) / 1000);

  byId("days").textContent = days.toLocaleString("ar-EG");
  byId("hours").textContent = String(hours).padStart(2, "0");
  byId("minutes").textContent = String(minutes).padStart(2, "0");
  byId("seconds").textContent = String(seconds).padStart(2, "0");
}

function renderCounterDate() {
  byId("counter-date").innerHTML = `من يوم ${LOVE_START_DATE.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}<button id="edit-date" type="button">ظبّطي التاريخ</button>`;
  byId("edit-date").addEventListener("click", openDatePicker);
}

function openDatePicker() {
  const year = LOVE_START_DATE.getFullYear();
  const month = String(LOVE_START_DATE.getMonth() + 1).padStart(2, "0");
  const day = String(LOVE_START_DATE.getDate()).padStart(2, "0");
  const today = new Date();
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  openModal(`<h2 id="modal-title">إمتى بدأت حكايتنا؟</h2><p>اختاري اليوم اللي تحبي العدّاد يبدأ منه.. والتاريخ هيتحفظ على جهازك.</p><label class="date-picker-label" for="start-date-input">تاريخ البداية</label><input class="date-picker-input" id="start-date-input" type="date" value="${year}-${month}-${day}" max="${maxDate}"><p class="quiz-feedback" id="date-feedback" aria-live="polite"></p><button class="button button-primary" id="save-start-date" type="button">احفظي التاريخ ♡</button>`);
  byId("save-start-date").addEventListener("click", () => {
    const input = byId("start-date-input");
    if (!input.value || input.value > maxDate) {
      byId("date-feedback").textContent = "اختاري تاريخ النهارده أو يوم قبله.";
      return;
    }
    try {
      localStorage.setItem(DATE_STORAGE_KEY, input.value);
    } catch (error) {
      console.error("تعذّر حفظ تاريخ بداية الحكاية:", error);
      byId("date-feedback").textContent = "مش قادرين نحفظ التاريخ على الجهاز ده.";
      return;
    }
    appSettings.startDate = input.value;
    persistSettings();
    LOVE_START_DATE = new Date(`${input.value}T12:00:00`);
    renderCounterDate();
    updateCounter();
    closeModal();
    showToast("التاريخ اتظبط.. وكل ثانية أحلى ♡");
  });
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(content) {
  lastFocusedElement = document.activeElement;
  modalContent.innerHTML = content;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal-close").focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

function encodeBase64(bytes) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256);
  return encodeBase64(new Uint8Array(bits));
}

function passwordMatches(first, second) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  return difference === 0;
}

function validPasswordConfig(config) {
  return Boolean(config && typeof config === "object" && typeof config.salt === "string" && typeof config.hash === "string");
}

function readPresenceState() {
  const saved = readStoredValue(PRESENCE_STORAGE_KEY, {});
  if (!saved || typeof saved !== "object") return { sessions: [], events: [] };
  return {
    sessions: Array.isArray(saved.sessions) ? saved.sessions.filter((session) => session && typeof session.id === "string" && ["you", "partner"].includes(session.person) && Number.isFinite(session.seenAt)) : [],
    events: Array.isArray(saved.events) ? saved.events.filter((entry) => entry && ["you", "partner"].includes(entry.person) && ["دخل", "خرج"].includes(entry.action) && Number.isFinite(entry.at)).slice(-12) : []
  };
}

function renderPresence() {
  const state = readPresenceState();
  const online = byId("presence-online");
  const events = byId("presence-events");
  online.replaceChildren();
  events.replaceChildren();
  if (!state.sessions.length) {
    const item = document.createElement("li");
    item.textContent = "مفيش حد ظاهر حاليًا";
    online.append(item);
  } else {
    state.sessions.forEach((session) => {
      const item = document.createElement("li");
      item.textContent = `${avatars[session.person].name} موجود دلوقتي`;
      online.append(item);
    });
  }
  if (!state.events.length) {
    const item = document.createElement("li");
    item.textContent = "لسه مفيش حركة مسجلة";
    events.append(item);
  } else {
    state.events.slice().reverse().slice(0, 4).forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = `${avatars[entry.person].name} ${entry.action} · ${new Date(entry.at).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}`;
      events.append(item);
    });
  }
}

function updatePresenceState(update) {
  const state = readPresenceState();
  const now = Date.now();
  const stillActive = [];
  state.sessions.forEach((session) => {
    if (now - session.seenAt <= 45000) {
      stillActive.push(session);
    } else {
      state.events.push({ person: session.person, action: "خرج", at: now });
    }
  });
  state.sessions = stillActive;
  update(state, now);
  state.events = state.events.slice(-12);
  if (!writeStoredValue(PRESENCE_STORAGE_KEY, state)) return false;
  renderPresence();
  return true;
}

function startPresence(person) {
  currentPresence = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, person };
  const joined = updatePresenceState((state, now) => {
    state.sessions.push({ ...currentPresence, seenAt: now });
    state.events.push({ person, action: "دخل", at: now });
  });
  if (!joined) {
    currentPresence = null;
    return;
  }
  const heartbeat = () => {
    if (!currentPresence) return;
    updatePresenceState((state, now) => {
      const session = state.sessions.find((item) => item.id === currentPresence.id);
      if (session) session.seenAt = now;
      else state.sessions.push({ ...currentPresence, seenAt: now });
    });
  };
  window.setInterval(heartbeat, 12000);
}

function endPresence() {
  if (!currentPresence) return;
  const leaving = currentPresence;
  currentPresence = null;
  updatePresenceState((state, now) => {
    state.sessions = state.sessions.filter((session) => session.id !== leaving.id);
    state.events.push({ person: leaving.person, action: "خرج", at: now });
  });
}

function initializeEntryGate() {
  const form = byId("entry-form");
  const gate = byId("entry-gate");
  let lock = null;
  let loadError = false;
  try {
    const saved = localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (saved !== null) {
      lock = JSON.parse(saved);
      if (!validPasswordConfig(lock)) loadError = true;
    }
  } catch (error) {
    console.error("تعذّرت قراءة كلمة مرور الدخول:", error);
    loadError = true;
  }

  const setup = lock === null && !loadError;
  byId("entry-title").textContent = loadError ? "تعذّر فتح القفل" : setup ? "اعملي كلمة مرور لحكايتنا" : "حكايتنا مستنياكي";
  byId("entry-description").textContent = loadError
    ? "بيانات كلمة المرور المحفوظة تالفة. امسحي بيانات الموقع من المتصفح وابدئي من جديد."
    : setup ? "دي أول مرة؟ اعملي كلمة مرور عشان تحمي الصفحة." : "اختاري اسمك واكتبي كلمة المرور عشان تدخلي.";
  if (loadError) {
    form.innerHTML = '<p class="password-error" role="alert">القفل المحفوظ غير صالح، ومش هنفتح الصفحة من غيره.</p>';
    return;
  }
  if (!crypto.subtle) {
    form.innerHTML = '<p class="password-error" role="alert">المتصفح مش مفعّل التشفير الآمن. افتحي الصفحة من localhost أو متصفح آمن.</p>';
    return;
  }
  form.innerHTML = setup
    ? '<label>كلمة المرور الجديدة<input name="newPassword" type="password" autocomplete="new-password" minlength="4" required></label><label>أكّدي كلمة المرور<input name="confirmPassword" type="password" autocomplete="new-password" minlength="4" required></label><p class="password-error" id="entry-error" role="alert"></p><button class="button button-primary" type="submit">اعملي القفل وادخلي ♡</button>'
    : '<label>كلمة المرور<input name="password" type="password" autocomplete="current-password" required></label><p class="password-error" id="entry-error" role="alert"></p><button class="button button-primary" type="submit">افتحي حكايتنا ♡</button>';
  form.querySelector("input").focus();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const error = byId("entry-error");
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      if (setup) {
        const password = String(data.get("newPassword") || "");
        if (password.length < 4) {
          error.textContent = "كلمة المرور لازم تكون ٤ رموز على الأقل.";
          return;
        }
        if (password !== String(data.get("confirmPassword") || "")) {
          error.textContent = "كلمتا المرور مش متطابقتين.";
          return;
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        lock = { salt: encodeBase64(salt), hash: await hashPassword(password, salt) };
        if (!writeStoredValue(PASSWORD_STORAGE_KEY, lock)) return;
      } else {
        const enteredHash = await hashPassword(String(data.get("password") || ""), decodeBase64(lock.salt));
        if (!passwordMatches(enteredHash, lock.hash)) {
          error.textContent = "كلمة المرور مش مظبوطة، جرّبي تاني.";
          return;
        }
      }
      const person = byId("entry-person").value;
      activeChatSender = person;
      document.querySelectorAll("[data-chat-sender]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.chatSender === person);
      });
      byId("chat-input").placeholder = `اكتبي باسم ${avatars[person].name}...`;
      renderChat();
      document.body.classList.remove("is-locked");
      gate.remove();
      startPresence(person);
    } catch (errorObject) {
      console.error("تعذّر التحقق من كلمة مرور الدخول:", errorObject);
      error.textContent = "ماقدرناش نتحقق من كلمة المرور. جرّبي تاني.";
    } finally {
      submit.disabled = false;
    }
  });
}

async function requestPasswordAccess(action, changePassword = false) {
  let storedLock = null;
  let hasLock = false;
  try {
    const rawLock = localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (rawLock !== null) {
      hasLock = true;
      storedLock = JSON.parse(rawLock);
    }
  } catch (error) {
    console.error("تعذّرت قراءة قفل الصفحة المحفوظ:", error);
    showToast("بيانات كلمة المرور تالفة. امسحي القفل من بيانات الموقع في المتصفح.");
    return;
  }
  if (hasLock && !validPasswordConfig(storedLock)) {
    console.error("صيغة قفل الصفحة المحفوظ غير صحيحة.");
    showToast("بيانات كلمة المرور غير صالحة. امسحي القفل من بيانات الموقع في المتصفح.");
    return;
  }
  if (!crypto.subtle) {
    showToast("تأكدي إن الصفحة مفتوحة في متصفح آمن عشان نقدر نحميها.");
    return;
  }

  const settingUp = !hasLock;
  const fields = changePassword
    ? '<label>كلمة المرور الحالية<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>كلمة المرور الجديدة<input name="newPassword" type="password" autocomplete="new-password" minlength="4" required></label><label>أكّدي كلمة المرور الجديدة<input name="confirmPassword" type="password" autocomplete="new-password" minlength="4" required></label>'
    : settingUp
      ? '<label>كلمة المرور الجديدة<input name="newPassword" type="password" autocomplete="new-password" minlength="4" required></label><label>أكّدي كلمة المرور<input name="confirmPassword" type="password" autocomplete="new-password" minlength="4" required></label>'
      : '<label>كلمة المرور<input name="password" type="password" autocomplete="current-password" required></label>';
  const title = changePassword ? "تغيير كلمة المرور" : settingUp ? "اعملي كلمة مرور للصفحة" : "كلمة المرور";
  const button = changePassword || settingUp ? "احفظي كلمة المرور" : "افتحي القفل";
  openModal(`<h2 id="modal-title">${title}</h2><form class="password-form" id="password-form">${fields}<p class="password-error" id="password-error" role="alert"></p><button class="button button-primary" type="submit">${button}</button></form><p class="password-hint">اختاري ٤ رموز أو أكتر. القفل محفوظ محليًا على الجهاز ده؛ استخدمي قفل الموبايل لحماية حقيقية.</p>`);
  const form = byId("password-form");
  form.querySelector("input").focus();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const error = byId("password-error");
    const currentPassword = String(data.get("currentPassword") || data.get("password") || "");
    const newPassword = String(data.get("newPassword") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      if (!settingUp) {
        const oldHash = await hashPassword(currentPassword, decodeBase64(storedLock.salt));
        if (!passwordMatches(oldHash, storedLock.hash)) {
          error.textContent = "كلمة المرور مش مظبوطة، جرّبي تاني.";
          return;
        }
      }

      if (settingUp || changePassword) {
        if (newPassword.length < 4) {
          error.textContent = "كلمة المرور لازم تكون ٤ رموز على الأقل.";
          return;
        }
        if (newPassword !== confirmPassword) {
          error.textContent = "كلمتا المرور مش متطابقتين.";
          return;
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const lock = { salt: encodeBase64(salt), hash: await hashPassword(newPassword, salt) };
        if (!writeStoredValue(PASSWORD_STORAGE_KEY, lock)) return;
        showToast(settingUp ? "اتعملت كلمة مرور للصفحة ♡" : "كلمة المرور اتغيرت.");
      }

      closeModal();
      if (!changePassword) action();
    } catch (errorObject) {
      console.error("تعذّر التحقق من كلمة المرور:", errorObject);
      error.textContent = "ماقدرناش نتحقق من كلمة المرور. جرّبي تاني.";
    } finally {
      submit.disabled = false;
    }
  });
}

function persistSettings() {
  return writeStoredValue(SETTINGS_STORAGE_KEY, appSettings);
}

function applySettings() {
  document.body.dataset.theme = appSettings.theme;
  const themeColors = { blue: "#eff8ff", sky: "#eaf8ff", lavender: "#f4f3ff", pink: "#fff3fa" };
  document.querySelector('meta[name="theme-color"]').content = themeColors[appSettings.theme];
  document.querySelectorAll(".brand > span:last-child").forEach((element) => { element.textContent = appSettings.siteName; });
  document.title = `${appSettings.siteName.replace(/[.]$/, "")} | حتة من قلبي`;
  document.querySelector('[data-copy="heroBadge"]').textContent = appSettings.heroBadge;
  document.querySelector('[data-copy="headline"]').textContent = appSettings.headline;
  document.querySelector('[data-copy="description"]').textContent = appSettings.description;
  document.querySelector('[data-copy="letter"]').textContent = appSettings.letter;
  const cover = byId("cover-photo");
  cover.hidden = !appSettings.coverPhoto;
  if (appSettings.coverPhoto) cover.src = appSettings.coverPhoto;
  else cover.removeAttribute("src");
  byId("hero-couple-scene").hidden = Boolean(appSettings.coverPhoto);
  byId("hero-photo").classList.toggle("has-illustrated-cover", !appSettings.coverPhoto);
  document.querySelectorAll('input[name="theme"]').forEach((input) => { input.checked = input.value === appSettings.theme; });
  updateCounter();
  renderCounterDate();
}

function openSettings() {
  lastFocusedElement = document.activeElement;
  const form = byId("settings-form");
  for (const [field, value] of Object.entries(appSettings)) {
    const input = form.elements.namedItem(field);
    if (!input) continue;
    if (field === "theme") continue;
    input.value = value;
  }
  document.querySelector(`input[name="theme"][value="${appSettings.theme}"]`).checked = true;
  const today = new Date();
  form.elements.namedItem("startDate").max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  byId("settings-overlay").classList.add("is-open");
  byId("settings-overlay").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  form.elements.namedItem("siteName").focus();
}

function closeSettings() {
  byId("settings-overlay").classList.remove("is-open");
  byId("settings-overlay").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

function renderAvatar(person) {
  const avatar = avatars[person];
  const preview = document.querySelector(`[data-avatar-preview="${person}"]`);
  preview.style.setProperty("--skin", avatar.skin);
  preview.style.setProperty("--hair", avatar.hair);
  preview.style.setProperty("--shirt", avatar.shirt);
  preview.dataset.style = avatar.style;
  preview.dataset.glasses = String(avatar.glasses);
  preview.classList.toggle("has-photo", Boolean(avatar.photo));
  const photo = preview.querySelector(".avatar-photo");
  photo.src = avatar.photo || "";
  const illustration = preview.querySelector(".avatar-illustration");
  illustration.setAttribute("aria-label", `أفتار ${avatar.name.trim() || DEFAULT_AVATARS[person].name}`);
  const name = avatar.name.trim() || DEFAULT_AVATARS[person].name;
  document.querySelector(`[data-avatar-name="${person}"]`).textContent = name;
  document.querySelector(`[data-chat-name="${person}"]`).textContent = name;

  const mini = document.querySelector(`[data-chat-avatar="${person}"]`);
  mini.dataset.style = avatar.style;
  mini.dataset.glasses = String(avatar.glasses);
  mini.style.setProperty("--skin", avatar.skin);
  mini.style.setProperty("--hair", avatar.hair);
  mini.style.setProperty("--shirt", avatar.shirt);
  mini.style.backgroundImage = avatar.photo ? `url("${avatar.photo}")` : "";
  mini.replaceChildren();
  if (avatar.photo) {
    mini.textContent = "";
  } else {
    const miniIllustration = illustration.cloneNode(true);
    miniIllustration.removeAttribute("role");
    miniIllustration.removeAttribute("aria-label");
    mini.append(miniIllustration);
  }

  const heroCharacter = document.querySelector(`[data-hero-avatar="${person}"]`);
  const heroIllustration = illustration.cloneNode(true);
  heroIllustration.classList.add("hero-avatar-illustration");
  heroIllustration.removeAttribute("role");
  heroIllustration.removeAttribute("aria-label");
  heroCharacter.replaceChildren(heroIllustration);
  heroCharacter.style.setProperty("--skin", avatar.skin);
  heroCharacter.style.setProperty("--hair", avatar.hair);
  heroCharacter.style.setProperty("--shirt", avatar.shirt);
  heroCharacter.dataset.style = avatar.style;
  heroCharacter.dataset.glasses = String(avatar.glasses);
  heroCharacter.classList.toggle("has-photo", Boolean(avatar.photo));
  if (avatar.photo) heroCharacter.style.setProperty("--avatar-photo", `url("${avatar.photo}")`);

  document.querySelectorAll(`[data-avatar-swatches="${person}:skin"] .color-swatch`).forEach((button) => button.classList.toggle("is-selected", button.dataset.color === avatar.skin));
  document.querySelectorAll(`[data-avatar-swatches="${person}:hair"] .color-swatch`).forEach((button) => button.classList.toggle("is-selected", button.dataset.color === avatar.hair));
  document.querySelectorAll(`[data-avatar-swatches="${person}:shirt"] .color-swatch`).forEach((button) => button.classList.toggle("is-selected", button.dataset.color === avatar.shirt));
  const styleField = document.querySelector(`[data-avatar-field="${person}:style"]`);
  const glassesField = document.querySelector(`[data-avatar-field="${person}:glasses"]`);
  const nameField = document.querySelector(`[data-avatar-field="${person}:name"]`);
  if (document.activeElement !== styleField) styleField.value = avatar.style;
  if (document.activeElement !== glassesField) glassesField.checked = avatar.glasses;
  if (document.activeElement !== nameField) nameField.value = avatar.name;
}

function persistAvatar(person) {
  if (writeStoredValue(AVATARS_STORAGE_KEY, avatars)) renderAvatar(person);
}

function setupAvatarStudio() {
  document.querySelectorAll("[data-avatar-swatches]").forEach((container) => {
    const [person, property] = container.dataset.avatarSwatches.split(":");
    AVATAR_COLORS[property].forEach((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.dataset.color = color;
      button.style.backgroundColor = color;
      button.setAttribute("aria-label", `لون ${property === "skin" ? "بشرة" : property === "hair" ? "شعر" : "لبس"} ${index + 1}`);
      button.addEventListener("click", () => {
        avatars[person][property] = color;
        persistAvatar(person);
      });
      container.append(button);
    });
  });

  document.querySelectorAll("[data-avatar-field]").forEach((field) => {
    const [person, property] = field.dataset.avatarField.split(":");
    const update = () => {
      avatars[person][property] = property === "glasses" ? field.checked : property === "name" ? (field.value.trim() || DEFAULT_AVATARS[person].name) : field.value;
      persistAvatar(person);
    };
    field.addEventListener(property === "name" ? "input" : "change", update);
  });

  document.querySelectorAll("[data-avatar-upload]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(`[data-avatar-file="${button.dataset.avatarUpload}"]`).click());
  });
  document.querySelectorAll("[data-avatar-file]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        avatars[input.dataset.avatarFile].photo = await compressImage(file);
        persistAvatar(input.dataset.avatarFile);
      } catch (error) {
        console.error("تعذّر تحديث صورة الأفتار:", error);
        showToast("مش قادرين نفتح الصورة دي.. جرّبي صورة تانية.");
      } finally {
        input.value = "";
      }
    });
  });
  document.querySelectorAll("[data-avatar-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      const person = button.dataset.avatarClear;
      avatars[person] = { ...DEFAULT_AVATARS[person], name: avatars[person].name };
      persistAvatar(person);
    });
  });
  renderAvatar("you");
  renderAvatar("partner");
}

document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  if (event.key === "Escape" && byId("settings-overlay").classList.contains("is-open")) closeSettings();
});

const complimentDetails = [
  "ضحكتك اللي بتيجي من قلبك", "طيبتك اللي بتبان في أبسط تصرف", "طريقة كلامك لما تتحمسي",
  "اهتمامك بالتفاصيل اللي غيرك ممكن ماياخدش باله منها", "خفة دمك حتى في الأيام العادية",
  "قلبك الحنين اللي بيساع اللي حواليكي", "حماسك للحاجات اللي بتحبيها", "نظرتك اللي بتقول كلام كتير",
  "صبرك وقت ما الدنيا تبقى ملخبطة", "إنك بتعرفي تفرّحي اللي حواليكي من غير مجهود"
];
const complimentHookStyles = [
  (detail) => `عارفة إيه من أكتر الحاجات اللي بحبها فيكي؟ ${detail}.`,
  (detail) => `كل مرة باخد بالي من ${detail}، بفتكر أنا محظوظ قد إيه بيكي.`,
  (detail) => `يمكن ما بقولهاش كل مرة، بس ${detail} واخدة حتة كبيرة من قلبي.`,
  (detail) => `لو هحكي عن حاجة مميزة فيكي، هحكي عن ${detail} الأول.`,
  (detail) => `يا حبيبتي، ${detail} من التفاصيل اللي بتخليني أختارك كل يوم.`
];
const complimentBridges = [
  "وبالمناسبة،", "وعلى فكرة،", "والحلو في الموضوع،", "ومن غير مبالغة،", "ولو هقولك الصراحة،",
  "وكل ما أفكر فيها،", "والتفصيلة الأجمل،", "عارفة كمان؟", "وده غير إن،", "ووسط كل ده،"
];
const complimentClosings = [
  "وجودك بيهوّن عليا حاجات كتير.", "اليوم العادي معاكي بيبقى ذكرى حلوة.",
  "صوتك بيخلّي قلبي يهدى.", "أنا بحب إنك إنتِ، بكل تفاصيلك.",
  "الدنيا بتبقى ألطف لما تبقي قريبة.", "كل مرة بضحك معاكي بحس إن دي أحلى لحظة.",
  "مكانك عندي ملوش شبه.", "نفسي أفضل أشاركك الحاجات الصغيرة قبل الكبيرة.",
  "أنا فخور بيكي وبالطريقة اللي بتكمّلي بيها.", "وجودك في حياتي مش حاجة باخدها كأنها مضمونة."
];
const compliments = complimentDetails.flatMap((detail) =>
  complimentHookStyles.flatMap((makeHook) =>
    complimentBridges.flatMap((bridge) =>
      complimentClosings.map((closing) =>
        `${makeHook(detail)} ${bridge} ${closing}`))));

const dates = [
  "قهوة وحكاوي كتير.. والموبايلات على الصامت ☕",
  "نتمشى من غير وجهة ونشوفنا هنروح فين 🌙",
  "فيلم حلو، فشار، وقعدة جنبك 🍿",
  "نجيب حاجة مسكرة ونقعد في مكان هادي 🍰",
  "خروجة على البحر وقت الغروب.. إيه رأيك؟ 🌊",
  "نعمل أكل سوا.. حتى لو المطبخ اتقلب 😌"
];

const loveSongs = [
  { title: "شوف لمعة عينها", artist: "أغنية حب", search: "شوف لمعة عينها اغنية" },
  { title: "تملي معاك", artist: "عمرو دياب", search: "عمرو دياب تملي معاك" },
  { title: "حبيبي يا نور العين", artist: "عمرو دياب", search: "عمرو دياب حبيبي يا نور العين" },
  { title: "أنا عايشة", artist: "إليسا", search: "اليسا انا عايشة اغنية" },
  { title: "بتمون", artist: "نانسي عجرم", search: "نانسي عجرم بتمون" },
  { title: "قرب حبيبي", artist: "عمرو دياب", search: "عمرو دياب قرب حبيبي" },
  { title: "حالة حب", artist: "إليسا", search: "اليسا حالة حب" },
  { title: "يا عسل", artist: "أحمد سعد", search: "احمد سعد يا عسل" },
  { title: "حبيبي يا", artist: "تامر حسني", search: "تامر حسني حبيبي يا" },
  { title: "لو بص في عيني", artist: "شيرين", search: "شيرين لو بص في عيني" }
];

const quizQuestions = [
  { question: "إيه أكتر حاجة بتبسطني بجد؟", answers: ["لما نضحك سوا من قلبنا", "لما أشتري جزمة جديدة", "لما أنام طول اليوم"], correct: 0 },
  { question: "لو هنخرج خروجة على مزاجي، أختار إيه؟", answers: ["قعدة هادية وحكاوي معاكي", "اجتماع شغل طويل", "أقعد أرتب الدولاب"], correct: 0 },
  { question: "إيه أحلى حاجة في يومي؟", answers: ["أسمع صوتك وأطمن عليكي", "أخلّص الإيميلات", "أدور على الشاحن"], correct: 0 }
];

const storyGameRounds = [
  { question: "خروجة أحلامنا تبدأ بإيه؟", options: ["قهوة وحكاوي ☕", "تمشية وقت الغروب 🌅"] },
  { question: "نختار يوم هادي ولا مليان حركة؟", options: ["هدوء وراحة 🧸", "مغامرة وضحك 🎡"] },
  { question: "فيلم ولا مسلسل طويل؟", options: ["فيلم وفشار 🍿", "مسلسل وحلقات كتير 📺"] },
  { question: "أكلة نعملها سوا؟", options: ["حاجة حلوة 🍰", "أكلة جديدة 🍝"] },
  { question: "أغنية ولا كلام من القلب؟", options: ["أغنيتنا المفضلة 🎶", "حكاوي لحد ما الوقت يجري 💬"] },
  { question: "البحر ولا مكان أخضر؟", options: ["صوت الموج 🌊", "قعدة وسط الزرع 🌿"] },
  { question: "نصور اليوم ولا نعيشه من غير كاميرا؟", options: ["صور كتير للذكرى 📸", "نعيش اللحظة سوا 🤍"] },
  { question: "مفاجأة صغيرة ولا هدية مختارة؟", options: ["مفاجأة من غير مناسبة 🎁", "حاجة على ذوقي 💝"] },
  { question: "صباح سوا ولا سهرة طويلة؟", options: ["فطار بدري 🌤️", "ليل وحكاوي 🌙"] },
  { question: "نلعب لعبة ولا نحل لغز؟", options: ["لعبة تضحكنا 🎲", "لغز نتحدّى بعض فيه 🧩"] },
  { question: "نروح مكان جديد ولا مكاننا المفضل؟", options: ["نكتشف مكان جديد 🗺️", "نرجع لمكان له ذكرى 💗"] },
  { question: "رسالة طويلة ولا مكالمة؟", options: ["جواب أحتفظ بيه 💌", "صوتك يطمنّي 📞"] },
  { question: "يوم مطر ولا شمس؟", options: ["مطر وبطانية ☔", "شمس وهواء حلو ☀️"] },
  { question: "نختار لون لليوم؟", options: ["بيبي بلو 🩵", "لافندر هادي 💜"] },
  { question: "إيه أحلى ذكرى نعيدها؟", options: ["أول ضحكة من القلب 😄", "أول مرة حسّينا إننا قريبين 🫶"] },
  { question: "نخطط لكل حاجة ولا نسيبها للصدفة؟", options: ["خطة صغيرة مرتبة 📝", "نمشي ورا مزاجنا ✨"] },
  { question: "حلوى نشاركها؟", options: ["آيس كريم 🍦", "كيكة شوكولاتة 🍫"] },
  { question: "لو عندنا ساعة زيادة؟", options: ["نتمشى سوا 🚶", "نقعد نحكي أكتر 🛋️"] },
  { question: "نختم اليوم بإيه؟", options: ["صورة وقلب 🩷", "كلمة حلوة قبل النوم 🌙"] },
  { question: "اختاري وعد صغير لينا؟", options: ["نفضل نضحك سوا 😌", "نفضل نسمع لبعض 🤍"] }
];
const memorySymbols = ["♡", "☼", "✿", "☁", "✦", "♫"];
const wordChallenges = [
  { word: "ضحكة", hint: "أحلى صوت بيغيّر مود اليوم كله." },
  { word: "حكاية", hint: "حاجة بنكتبها سوا، وكل يوم فيها فصل جديد." },
  { word: "قهوة", hint: "مشروب وخروجة حلوة معاها كلام كتير." },
  { word: "نجمة", hint: "حاجة من السما بتفكرني بيكي." },
  { word: "قلب", hint: "مكانك فيه محفوظ." },
  { word: "ذكرى", hint: "لحظة حلوة بنفتكرها ونبتسم." },
  { word: "فرحة", hint: "الإحساس اللي بييجي لما تبقي مبسوطة." },
  { word: "ونس", hint: "إحساس إن فيه حد قريب حتى لو اليوم طويل." }
];
const heartQuestions = [
  "إيه تفصيلة صغيرة في يومك بتحسّنك على طول؟",
  "لو نقدر نعيد يوم واحد حلو عشناه، تختاري أنهي يوم؟",
  "إيه أغنية أول ما تسمعيها تفتكري لحظة حلوة؟",
  "إيه حاجة نفسك نجربها سوا ومأجلينها؟",
  "إيه أكتر تصرف بسيط بيخليكي تحسي إنك متقدّرة؟",
  "لو يومنا المثالي من غير ميزانية ولا مواعيد، هيبقى عامل إزاي؟",
  "إيه ذكرى من طفولتك بتحبي تحكيها؟",
  "إيه حاجة اتعلمتيها عن نفسك السنة دي وفخورة بيها؟",
  "إيه أكتر حاجة بتضحكك حتى لو مودك مش أحسن حاجة؟",
  "لو تختاري اسم لفصل جديد في حكايتنا، هيبقى إيه؟",
  "إيه مكان بتحسي فيه براحة وبتحبي ترجعي له؟",
  "إيه كلمة حلوة نفسك تسمعيها في يوم صعب؟",
  "إيه حاجة بتحبيها في طريقتنا وإحنا بنتكلم؟",
  "لو هنطبخ حاجة سوا، نختار إيه ومين هيبوظها الأول؟",
  "إيه أمنية صغيرة نفسك تتحقق قريب؟"
];
let wordChallengeIndex = 0;
let memoryCards = [];
let memoryOpenCards = [];
let memoryMatches = 0;
let memoryAttempts = 0;
let memoryLocked = false;

let quizIndex = 0;
let quizScore = 0;
let storyGameIndex = 0;
const storyGameAnswers = [];

function showQuizQuestion() {
  const question = quizQuestions[quizIndex];
  modalContent.innerHTML = `
    <span class="quiz-progress">السؤال ${quizIndex + 1} من ${quizQuestions.length} · النتيجة ${quizScore}</span>
    <h2 id="modal-title" class="quiz-question">${question.question}</h2>
    <div class="quiz-options">${question.answers.map((answer, index) => `<button class="quiz-option" type="button" data-answer="${index}">${answer}</button>`).join("")}</div>
    <p class="quiz-feedback" aria-live="polite"></p>`;

  modalContent.querySelectorAll(".quiz-option").forEach((button) => {
    button.addEventListener("click", () => {
      const picked = Number(button.dataset.answer);
      const feedback = modalContent.querySelector(".quiz-feedback");
      modalContent.querySelectorAll(".quiz-option").forEach((option) => { option.disabled = true; });
      if (picked === question.correct) {
        quizScore += 1;
        button.classList.add("correct");
        feedback.textContent = "شطورة.. عرفتيها من غير تفكير كمان! ♡";
      } else {
        button.classList.add("wrong");
        modalContent.querySelector(`[data-answer="${question.correct}"]`).classList.add("correct");
        feedback.textContent = "قريبة.. بس الإجابة الصح: أي حاجة فيها إنتِ ♥";
      }

      window.setTimeout(() => {
        quizIndex += 1;
        if (quizIndex < quizQuestions.length) {
          showQuizQuestion();
        } else {
          modalContent.innerHTML = `<h2 id="modal-title">خلص التحدّي! ✨</h2><p>جبتي ${quizScore} من ${quizQuestions.length}.. بس أنا كسبان في كل الحالات عشان إنتِ هنا.</p><button class="button button-primary" type="button" id="quiz-again">نلعب تاني؟</button>`;
          byId("quiz-again").addEventListener("click", startQuiz);
        }
      }, 1100);
    });
  });
}

function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  openModal("");
  showQuizQuestion();
}

function addHearts(amount = 14, originX = window.innerWidth / 2) {
  const layer = byId("hearts-layer");
  const symbols = ["♥", "♡", "✦"];
  for (let index = 0; index < amount; index += 1) {
    const heart = document.createElement("span");
    heart.className = "heart-pop";
    heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    heart.style.left = `${Math.min(window.innerWidth - 18, Math.max(18, originX + (Math.random() - 0.5) * 180))}px`;
    heart.style.animationDelay = `${Math.random() * 0.45}s`;
    heart.style.fontSize = `${12 + Math.random() * 18}px`;
    layer.appendChild(heart);
    window.setTimeout(() => heart.remove(), 2100);
  }
}

function showRandomItem(items, heading) {
  const item = items[Math.floor(Math.random() * items.length)];
  openModal(`<h2 id="modal-title">${heading}</h2><p>${item}</p><button class="button button-primary" type="button" data-close-modal>حلوة دي ♡</button>`);
  modalContent.querySelector("[data-close-modal]").addEventListener("click", closeModal);
}

function showNextCompliment() {
  let index = Number(readStoredValue(COMPLIMENT_INDEX_KEY, 0));
  if (!Number.isInteger(index) || index < 0 || index > compliments.length) index = 0;
  if (index === compliments.length) {
    openModal(`<span class="quiz-progress">خلصتوا الـ٥٠٠٠ كلمة الحلوة</span><h2 id="modal-title">الكلام الحلو مبيخلصش ♡</h2><p>دي كانت ٥٠٠٠ رسالة مخصوص ليكي.. ولسه عندي كلام أكتر.</p><button class="button button-primary" type="button" id="compliment-restart">ابدئي من الأول</button>`);
    byId("compliment-restart").addEventListener("click", () => {
      if (!writeStoredValue(COMPLIMENT_INDEX_KEY, 0)) return;
      showNextCompliment();
    });
    return;
  }
  openModal(`<span class="quiz-progress">رسالة ${(index + 1).toLocaleString("ar-EG")} من ٥٠٠٠</span><h2 id="modal-title">كلمة مخصوص ليكي ♡</h2><p>${compliments[index]}</p><button class="button button-primary" type="button" id="next-compliment">${index + 1 === compliments.length ? "كمّلي للآخر ♡" : "هاتِ رسالة كمان ♡"}</button>`);
  byId("next-compliment").addEventListener("click", () => {
    if (!writeStoredValue(COMPLIMENT_INDEX_KEY, index + 1)) return;
    showNextCompliment();
  });
}

function showStoryGameRound() {
  if (storyGameIndex >= storyGameRounds.length) {
    const dateIdea = dates[storyGameAnswers.filter((answer) => answer === 0).length % dates.length];
    modalContent.innerHTML = `<span class="quiz-progress">خلصتوا كل الجولات · اختياراتكم: ${storyGameAnswers.length}</span><h2 id="modal-title">حكايتكم شكلها حلو أوي ✨</h2><p>اختارتوا مع بعض تفاصيل يومكم المثالي.. والخروجة المقترحة: ${dateIdea}</p><button class="button button-primary" type="button" id="story-game-again">نلعب من الأول ♡</button>`;
    byId("story-game-again").addEventListener("click", startStoryGame);
    return;
  }
  const round = storyGameRounds[storyGameIndex];
  modalContent.innerHTML = `<span class="quiz-progress">جولة ${storyGameIndex + 1} من ${storyGameRounds.length}</span><h2 id="modal-title" class="quiz-question">${round.question}</h2><div class="quiz-options">${round.options.map((option, index) => `<button class="quiz-option" type="button" data-story-choice="${index}">${option}</button>`).join("")}</div><p class="quiz-feedback" aria-live="polite"></p>`;
  modalContent.querySelectorAll("[data-story-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      storyGameAnswers.push(Number(button.dataset.storyChoice));
      modalContent.querySelectorAll("[data-story-choice]").forEach((choice) => { choice.disabled = true; });
      button.classList.add("correct");
      modalContent.querySelector(".quiz-feedback").textContent = "اختيار حلو.. اتحفظ في حكايتكم ♡";
      window.setTimeout(() => {
        storyGameIndex += 1;
        showStoryGameRound();
      }, 550);
    });
  });
}

function startStoryGame() {
  storyGameIndex = 0;
  storyGameAnswers.length = 0;
  openModal("");
  showStoryGameRound();
}

function startMemoryGame() {
  openModal("");
  const deck = [...memorySymbols, ...memorySymbols].sort(() => Math.random() - 0.5);
  memoryCards = deck.map((symbol, index) => ({ id: index, symbol, matched: false }));
  memoryOpenCards = [];
  memoryMatches = 0;
  memoryAttempts = 0;
  memoryLocked = false;
  renderMemoryGame();
}

function renderMemoryGame() {
  modalContent.innerHTML = `<span class="quiz-progress">طابقي كل الرموز المتشابهة</span><h2 id="modal-title">لعبة القلوب 🧩</h2><p class="memory-game-status">الأزواج ${memoryMatches} من ${memorySymbols.length} · المحاولات ${memoryAttempts}</p><div class="memory-game-board">${memoryCards.map((card) => `<button class="memory-game-tile${card.matched ? " is-matched" : ""}${memoryOpenCards.includes(card.id) ? " is-open" : ""}" type="button" data-memory-card="${card.id}" aria-label="${memoryOpenCards.includes(card.id) || card.matched ? card.symbol : "اكشفي الكارت"}">${memoryOpenCards.includes(card.id) || card.matched ? card.symbol : "♡"}</button>`).join("")}</div><p class="quiz-feedback" aria-live="polite"></p>`;
  modalContent.querySelectorAll("[data-memory-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = memoryCards[Number(button.dataset.memoryCard)];
      if (memoryLocked || card.matched || memoryOpenCards.includes(card.id)) return;
      memoryOpenCards.push(card.id);
      renderMemoryGame();
      if (memoryOpenCards.length !== 2) return;
      memoryAttempts += 1;
      const [first, second] = memoryOpenCards.map((id) => memoryCards[id]);
      if (first.symbol === second.symbol) {
        first.matched = true;
        second.matched = true;
        memoryMatches += 1;
        memoryOpenCards = [];
        if (memoryMatches === memorySymbols.length) {
          addHearts(12);
          modalContent.innerHTML = `<span class="quiz-progress">كمّلتيها في ${memoryAttempts} محاولة</span><h2 id="modal-title">كل القلوب اتلاقت! ✨</h2><p>واضح إنكم بتعرفوا تلاقوا بعض حتى وسط كل الرموز.</p><button class="button button-primary" type="button" id="memory-game-again">نلعب تاني ♡</button>`;
          byId("memory-game-again").addEventListener("click", startMemoryGame);
        } else {
          renderMemoryGame();
        }
        return;
      }
      memoryLocked = true;
      renderMemoryGame();
      window.setTimeout(() => {
        memoryOpenCards = [];
        memoryLocked = false;
        renderMemoryGame();
      }, 850);
    });
  });
}

function showWordChallenge() {
  const challenge = wordChallenges[wordChallengeIndex % wordChallenges.length];
  const scrambled = [...challenge.word].sort(() => Math.random() - 0.5).join(" · ");
  modalContent.innerHTML = `<span class="quiz-progress">لغز ${wordChallengeIndex + 1} · خمني من الحروف</span><h2 id="modal-title" class="quiz-question">${scrambled}</h2><p class="word-game-hint">${challenge.hint}</p><form id="word-game-form" class="word-game-form"><label class="visually-hidden" for="word-game-answer">اكتبي الكلمة</label><input id="word-game-answer" maxlength="20" autocomplete="off" placeholder="الكلمة هي..." required><button class="button button-primary" type="submit">خمني ♡</button></form><p class="quiz-feedback" aria-live="polite"></p><button class="mini-button mini-button-quiet" id="word-game-skip" type="button">تخطي اللغز</button>`;
  const form = byId("word-game-form");
  form.querySelector("input").focus();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = form.querySelector("input").value.trim().replace(/\s+/g, "");
    const feedback = modalContent.querySelector(".quiz-feedback");
    if (answer === challenge.word) {
      feedback.textContent = `شطورة! الكلمة فعلًا «${challenge.word}» ✨`;
      addHearts(8);
      wordChallengeIndex += 1;
      form.querySelector("button").disabled = true;
      window.setTimeout(showWordChallenge, 900);
    } else {
      feedback.textContent = "مش هي دي.. جربي تاني، التلميح معاكي ♡";
      form.querySelector("input").select();
    }
  });
  byId("word-game-skip").addEventListener("click", () => {
    modalContent.innerHTML = `<h2 id="modal-title">الكلمة كانت «${challenge.word}» ✨</h2><p>يلا نجرب كلمة تانية؟</p><button class="button button-primary" type="button" id="word-game-next">كمّلي اللعب ♡</button>`;
    byId("word-game-next").addEventListener("click", () => {
      wordChallengeIndex += 1;
      showWordChallenge();
    });
  });
}

function showHeartQuestion() {
  const question = heartQuestions[Math.floor(Math.random() * heartQuestions.length)];
  openModal(`<span class="quiz-progress">سؤال عالسريع.. والإجابة على راحتكم</span><h2 id="modal-title">حكاوي من القلب 💬</h2><p class="heart-question">${question}</p><button class="button button-primary" type="button" id="heart-question-next">سؤال كمان ♡</button>`);
  byId("heart-question-next").addEventListener("click", showHeartQuestion);
  addHearts(5);
}

let selectedSongLink = null;
let localAudioUrl = null;

function setMusicStatus(title, status, isPlaying = false) {
  byId("music-title").textContent = title;
  byId("music-status").textContent = status;
  byId("music-player-art").classList.toggle("is-playing", isPlaying);
}

function renderMusicPlaylist() {
  const playlist = byId("music-playlist");
  loveSongs.forEach((song, index) => {
    const link = document.createElement("a");
    link.className = "music-track";
    link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.search)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.songIndex = String(index);

    const number = document.createElement("span");
    number.className = "music-track-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const copy = document.createElement("span");
    copy.className = "music-track-copy";
    const title = document.createElement("strong");
    title.textContent = song.title;
    const artist = document.createElement("small");
    artist.textContent = song.artist;
    copy.append(title, artist);
    const action = document.createElement("span");
    action.className = "music-track-action";
    action.setAttribute("aria-hidden", "true");
    action.textContent = "▶";
    link.append(number, copy, action);
    link.addEventListener("click", () => {
      if (selectedSongLink) selectedSongLink.classList.remove("is-selected");
      selectedSongLink = link;
      link.classList.add("is-selected");
      byId("music-youtube-link").href = link.href;
      setMusicStatus(song.title, "اختيارك جاهز.. يوتيوب هيفتح في صفحة جديدة ♡", true);
      addHearts(5);
    });
    playlist.append(link);
  });
}

function setUpMusicPlayer() {
  renderMusicPlaylist();
  const player = byId("local-audio-player");
  byId("upload-audio-button").addEventListener("click", () => byId("audio-file-input").click());
  byId("audio-file-input").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      showToast("اختاري ملف صوتي صالح.");
      event.target.value = "";
      return;
    }
    if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
    localAudioUrl = URL.createObjectURL(file);
    player.src = localAudioUrl;
    player.hidden = false;
    if (selectedSongLink) selectedSongLink.classList.remove("is-selected");
    selectedSongLink = null;
    byId("music-youtube-link").href = "https://www.youtube.com/results?search_query=%D8%A3%D8%BA%D8%A7%D9%86%D9%8A+%D8%AD%D8%A8+%D9%85%D8%B5%D8%B1%D9%8A%D8%A9";
    setMusicStatus(file.name.replace(/\.[^.]+$/, ""), "الأغنية بتشتغل من جهازك بس.. استمتعي ♡");
    player.play().catch((error) => {
      console.error("تعذّر تشغيل الملف الصوتي:", error);
      setMusicStatus(file.name, "اضغطي زر التشغيل في المشغل عشان تسمعيها.");
    });
  });
  player.addEventListener("play", () => byId("music-player-art").classList.add("is-playing"));
  player.addEventListener("pause", () => byId("music-player-art").classList.remove("is-playing"));
  player.addEventListener("ended", () => byId("music-player-art").classList.remove("is-playing"));
  byId("music-youtube-link").addEventListener("click", () => {
    if (!selectedSongLink) setMusicStatus("أغاني حب ليكم", "يوتيوب هيفتح في صفحة جديدة ♡");
  });
  window.addEventListener("pagehide", () => {
    if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
  }, { once: true });
}

async function compressImage(file) {
  const image = new Image();
  const source = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("تعذّر فتح الصورة"));
      image.src = source;
    });
    const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(source);
  }
}

function loadChatMessages() {
  const stored = readStoredValue(CHAT_STORAGE_KEY, []);
  if (!Array.isArray(stored)) {
    console.error("صيغة المحادثة المحفوظة غير صحيحة.");
    return [];
  }
  return stored.filter((message) => message && ["you", "partner"].includes(message.sender) && typeof message.text === "string" && message.text.length <= 500).map((message) => ({
    ...message,
    readAt: typeof message.readAt === "string" && !Number.isNaN(Date.parse(message.readAt)) ? message.readAt : null
  })).slice(-300);
}

let chatMessages = loadChatMessages();

function renderChat() {
  const container = byId("chat-messages");
  container.replaceChildren();
  if (!chatMessages.length) {
    const empty = document.createElement("p");
    empty.className = "chat-empty";
    empty.textContent = "لسه الشات فاضي.. ابعتي أول كلمة حلوة وخليها ذكرى بينكم ♡";
    container.append(empty);
    return;
  }

  chatMessages.forEach((message) => {
    const bubble = document.createElement("article");
    bubble.className = "chat-message";
    bubble.dataset.sender = message.sender;
    const head = document.createElement("div");
    head.className = "chat-message-head";
    const name = document.createElement("span");
    name.textContent = avatars[message.sender].name;
    head.append(name);
    const text = document.createElement("p");
    text.className = "chat-message-text";
    text.textContent = message.text;
    const time = document.createElement("time");
    time.className = "chat-time";
    const timestamp = new Date(message.createdAt);
    if (!Number.isNaN(timestamp.getTime())) {
      time.dateTime = timestamp.toISOString();
      time.textContent = timestamp.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
    }
    if (message.sender === activeChatSender) {
      const receipt = document.createElement("span");
      receipt.className = `chat-receipt${message.readAt ? " is-read" : ""}`;
      receipt.textContent = message.readAt ? "✓✓ اتقرت" : "✓ اتبعت";
      receipt.setAttribute("aria-label", message.readAt ? "تمت قراءة الرسالة" : "تم إرسال الرسالة");
      time.append(" · ", receipt);
    }
    bubble.append(head, text, time);
    container.append(bubble);
  });
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage(event) {
  event.preventDefault();
  const field = byId("chat-input");
  const text = field.value.trim();
  if (!text) return;
  const nextMessages = [...chatMessages, { sender: activeChatSender, text, createdAt: new Date().toISOString(), readAt: null }].slice(-300);
  if (!writeStoredValue(CHAT_STORAGE_KEY, nextMessages)) return;
  chatMessages = nextMessages;
  field.value = "";
  renderChat();
}

function markMessagesAsRead(reader) {
  const now = new Date().toISOString();
  let changed = false;
  const nextMessages = chatMessages.map((message) => {
    if (message.sender !== reader && !message.readAt) {
      changed = true;
      return { ...message, readAt: now };
    }
    return message;
  });
  if (!changed) return;
  if (!writeStoredValue(CHAT_STORAGE_KEY, nextMessages)) return;
  chatMessages = nextMessages;
  renderChat();
}

function clearChat() {
  if (!chatMessages.length) {
    showToast("الشات فاضي أصلًا ♡");
    return;
  }
  if (!window.confirm("تمسحي كل رسائل الشات من الجهاز ده؟")) return;
  if (!writeStoredValue(CHAT_STORAGE_KEY, [])) return;
  chatMessages = [];
  renderChat();
  showToast("اتمسحت رسائل الشات.");
}

function createMemory(src, photoIndex = -1) {
  const figure = document.createElement("figure");
  figure.className = "memory custom-memory";
  const image = document.createElement("img");
  image.src = src;
  image.alt = "صورة مضافة لألبوم ذكرياتنا";
  const caption = document.createElement("figcaption");
  caption.innerHTML = "ذكرى جديدة.. وحكاية أحلى <span>♡</span>";
  const remove = document.createElement("button");
  remove.className = "memory-remove";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "امسحي الصورة من الألبوم");
  remove.dataset.photoIndex = String(photoIndex);
  remove.addEventListener("click", () => removeMemory(Number(remove.dataset.photoIndex), figure));
  figure.append(image, caption, remove);
  byId("gallery-empty").hidden = true;
  byId("gallery").classList.remove("gallery-empty");
  byId("gallery").insertBefore(figure, byId("add-memory"));
}

function removeMemory(photoIndex, figure) {
  if (!window.confirm("تمسحي الصورة دي من ألبوم الذكريات؟")) return;
  try {
    const photos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(photos) || photoIndex < 0 || photoIndex >= photos.length) {
      throw new Error("الصورة مش موجودة في الألبوم المحفوظ");
    }
    photos.splice(photoIndex, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    figure.remove();
    document.querySelectorAll(".custom-memory").forEach((memory, index) => {
      const button = memory.querySelector(".memory-remove");
      button.dataset.photoIndex = String(index);
    });
    if (!photos.length) {
      byId("gallery-empty").hidden = false;
      byId("gallery").classList.add("gallery-empty");
    }
    showToast("الصورة اتمسحت من الألبوم.");
  } catch (error) {
    console.error("تعذّر حذف الصورة:", error);
    showToast("مش قادرين نمسح الصورة من الألبوم.");
  }
}

function loadSavedPhotos() {
  try {
    const photos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(photos)) throw new Error("صيغة الصور المحفوظة غير صحيحة");
    photos.forEach((photo, index) => {
      if (typeof photo !== "string" || !photo.startsWith("data:image/")) {
        throw new Error("صيغة إحدى الصور المحفوظة غير صحيحة");
      }
      createMemory(photo, index);
    });
  } catch (error) {
    console.error("تعذّر تحميل الصور المحفوظة:", error);
    showToast("مش قادرين نفتح الصور المحفوظة على الجهاز ده.");
  }
}

async function savePhotos(files) {
  let photos;
  try {
    photos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(photos)) photos = [];
  } catch (error) {
    console.error("تعذّر قراءة ألبوم الصور:", error);
    throw new Error("مش قادرين نفتح الألبوم المحفوظ على الجهاز.");
  }

  let savedCount = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const photo = await compressImage(file);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...photos, photo]));
      const photoIndex = photos.length;
      photos.push(photo);
      createMemory(photo, photoIndex);
      savedCount += 1;
    } catch (error) {
      console.error("تعذّر حفظ الصورة على الجهاز:", error);
      showToast("مساحة الصور على الجهاز خلصت.. جرّبي صورة أصغر.");
      return { savedCount, failed: true };
    }
  }
  return { savedCount, failed: false };
}

updateCounter();
renderCounterDate();
applySettings();
setupAvatarStudio();
renderChat();
setUpMusicPlayer();
window.setInterval(updateCounter, 1000);
loadSavedPhotos();
initializeEntryGate();
renderPresence();
window.addEventListener("storage", (event) => {
  if (event.key === PRESENCE_STORAGE_KEY) renderPresence();
  if (event.key === CHAT_STORAGE_KEY) {
    chatMessages = loadChatMessages();
    renderChat();
  }
});
window.addEventListener("pagehide", endPresence);
if ("IntersectionObserver" in window) {
  const chatVisibilityObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) markMessagesAsRead(activeChatSender);
  }, { threshold: 0.35 });
  chatVisibilityObserver.observe(byId("chat"));
}

byId("settings-button").addEventListener("click", () => requestPasswordAccess(openSettings));
byId("change-password").addEventListener("click", () => requestPasswordAccess(() => {}, true));
document.querySelectorAll("[data-close-settings]").forEach((button) => button.addEventListener("click", closeSettings));
byId("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const selectedDate = String(data.get("startDate") || DEFAULT_START_DATE);
  const today = new Date();
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || selectedDate > maxDate || Number.isNaN(new Date(`${selectedDate}T12:00:00`).getTime())) {
    showToast("اختاري تاريخ صحيح النهارده أو يوم قبله.");
    return;
  }

  const updated = {
    ...appSettings,
    siteName: String(data.get("siteName") || "").trim() || DEFAULT_SETTINGS.siteName,
    heroBadge: String(data.get("heroBadge") || "").trim() || DEFAULT_SETTINGS.heroBadge,
    headline: String(data.get("headline") || "").trim() || DEFAULT_SETTINGS.headline,
    description: String(data.get("description") || "").trim() || DEFAULT_SETTINGS.description,
    letter: String(data.get("letter") || "").trim() || DEFAULT_SETTINGS.letter,
    startDate: selectedDate,
    theme: String(data.get("theme") || "blue")
  };
  if (!THEME_NAMES.includes(updated.theme)) updated.theme = "blue";
  if (!writeStoredValue(SETTINGS_STORAGE_KEY, updated)) return;
  try {
    localStorage.setItem(DATE_STORAGE_KEY, selectedDate);
  } catch (error) {
    console.error("تعذّر تحديث نسخة تاريخ بداية الحكاية:", error);
  }
  Object.assign(appSettings, updated);
  LOVE_START_DATE = new Date(`${selectedDate}T12:00:00`);
  applySettings();
  closeSettings();
  showToast("الصفحة بقت على مزاجكم ♡");
});
byId("reset-settings").addEventListener("click", () => {
  if (!window.confirm("ترجّعي شكل الصفحة وإعداداتها الأصلية؟ الأفتارات والصور والشات هيفضلوا زي ما هم.")) return;
  Object.assign(appSettings, DEFAULT_SETTINGS);
  if (!persistSettings()) return;
  try {
    localStorage.removeItem(DATE_STORAGE_KEY);
  } catch (error) {
    console.error("تعذّر حذف تاريخ البداية القديم:", error);
  }
  LOVE_START_DATE = new Date(`${DEFAULT_START_DATE}T12:00:00`);
  applySettings();
  openSettings();
  showToast("رجّعنا إعدادات الصفحة الأصلية.");
});
byId("cover-upload").addEventListener("click", () => byId("cover-input").click());
byId("cover-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const coverPhoto = await compressImage(file);
    const updated = { ...appSettings, coverPhoto };
    if (!writeStoredValue(SETTINGS_STORAGE_KEY, updated)) return;
    Object.assign(appSettings, updated);
    applySettings();
    showToast("صورة الغلاف اتغيرت ♡");
  } catch (error) {
    console.error("تعذّر تحديث صورة الغلاف:", error);
    showToast("مش قادرين نفتح الصورة دي.. جرّبي صورة تانية.");
  } finally {
    event.target.value = "";
  }
});
byId("cover-reset").addEventListener("click", () => {
  const updated = { ...appSettings, coverPhoto: "" };
  if (!writeStoredValue(SETTINGS_STORAGE_KEY, updated)) return;
  Object.assign(appSettings, updated);
  applySettings();
  showToast("رجّعنا صورة الغلاف الأصلية.");
});
document.querySelectorAll("[data-chat-sender]").forEach((button) => {
  button.addEventListener("click", () => {
    activeChatSender = button.dataset.chatSender;
    document.querySelectorAll("[data-chat-sender]").forEach((personButton) => personButton.classList.toggle("is-active", personButton === button));
    byId("chat-input").placeholder = `اكتبي باسم ${avatars[activeChatSender].name}...`;
    renderChat();
    markMessagesAsRead(activeChatSender);
    byId("chat-input").focus();
  });
});
byId("chat-form").addEventListener("submit", sendChatMessage);
byId("clear-chat").addEventListener("click", () => requestPasswordAccess(clearChat));

byId("heart-button").addEventListener("click", (event) => {
  addHearts(20, event.clientX || window.innerWidth / 2);
  showToast("قلب مني ليكي.. وصل؟ ♥");
});
byId("surprise-button").addEventListener("click", (event) => {
  addHearts(23, event.clientX || window.innerWidth / 2);
  openModal('<h2 id="modal-title">مفاجأة صغيرة ليكي ✨</h2><p>لو كنتِ جنبي دلوقتي، كنت هقولك إن أحلى حظ في حياتي هو إنتِ.. وأفضل ماسك إيدك ومش عايز اللحظة تخلص.</p><button class="button button-primary" type="button" data-close-modal>وأنا كمان بحبك ♡</button>');
  modalContent.querySelector("[data-close-modal]").addEventListener("click", closeModal);
});
byId("quiz-button").addEventListener("click", startQuiz);
byId("compliment-button").addEventListener("click", showNextCompliment);
byId("date-button").addEventListener("click", () => showRandomItem(dates, "تمام.. دي خروجة علينا!"));
byId("story-game-button").addEventListener("click", startStoryGame);
byId("memory-game-button").addEventListener("click", startMemoryGame);
byId("word-game-button").addEventListener("click", () => {
  wordChallengeIndex = Math.floor(Math.random() * wordChallenges.length);
  openModal("");
  showWordChallenge();
});
byId("heart-game-button").addEventListener("click", showHeartQuestion);
byId("letter-button").addEventListener("click", () => {
  openModal('<h2 id="modal-title">يا بنوتي الحلوة..</h2><div class="love-letter-copy"><p>عارفة؟ ساعات ببقى عايز أقولك كلام كتير، وبعدين لما تيجي اللحظة ألاقي كل اللي في بالي اختصر في إني مبسوط إنك موجودة. مش عشان كل يوم لازم يبقى كامل، ولا عشان مفيش بينا اختلافات.. بس عشان وسط دوشة اليوم، وجودك بيفكرني إن لسه فيه حاجة حلوة أرجعلها.</p><p>بحب طريقتك وإنتِ بتحكيلي عن يومك، حتى التفاصيل اللي بتفتكري إنها عادية. بحب ضحكتك لما تسرق منك الكلام، وبحب إنك بتبقي إنتِ من غير ما تحاولي تبهري حد. ولو يومك كان تقيل أو حاسة إنك مش أحسن نسخة من نفسك، عايزك تفتكري إنك مش محتاجة تثبتيلي أي حاجة؛ أنا بحبك وإنتِ على طبيعتك، في هدوئك وهزارك، في قوتك وحتى في اللحظات اللي بتحتاجي فيها حد يسمعك وبس.</p><p>أنا مش بوعدك إن كل حاجة هتبقى سهلة، بس أوعدك إني هحاول أكون صاحبك قبل ما أكون أي حاجة تانية: أسمعك، أفهمك، وأفرحلك من قلبي. نفسي نفضل نعمل ذكريات صغيرة؛ مش لازم سفر ولا مفاجآت كبيرة.. ممكن مكالمة تطول، مشوار من غير خطة، أو كلمة في وقتها تخلّي اليوم أخف.</p><p>شكرًا إنك إنتِ، وشكرًا على كل مرة ضحكتيني فيها من غير ما تعرفي. أنا فخور بيكي، وممتن إن حكايتنا جمعتنا. خدي الكلام ده معاكي وقت ما تحتاجي تبتسمي: إنتِ غالية عندي أوي، ومكانك ثابت في قلبي.. وبحبك أكتر من اللي بعرف أرتبه في رسالة. ♥</p></div><button class="button button-primary" type="button" data-close-modal>جوابك وصل قلبي ♡</button>');
  addHearts(30);
  modalContent.querySelector("[data-close-modal]").addEventListener("click", closeModal);
});
byId("add-memory").addEventListener("click", () => byId("photo-input").click());
byId("photo-input").addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  try {
    const result = await savePhotos(files);
    if (result.savedCount && !result.failed) showToast("صورتكم بقت في ألبوم الذكريات ♡");
    else if (result.savedCount) showToast(`اتحفظ ${result.savedCount} صورة.. بس المساحة خلصت قبل ما يكمل الباقي.`);
  } catch (error) {
    console.error("تعذّرت إضافة الصور:", error);
    showToast(error.message);
  } finally {
    event.target.value = "";
  }
});
