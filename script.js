// Full script.js — game logic plus robust tooltip behavior (fixed-position bubble)
// Number animation updated to avoid downward animations and to prevent flashing/overwrites
// by tracking the last displayed numeric value and always cancelling/settling animations
// when a decrease occurs.

document.addEventListener('DOMContentLoaded', function () {
    // ---------------------------
    // Native Notification helpers (replaces the old in-page snackbar)
    // ---------------------------
    /**
     * Safely create a native browser notification (may throw on insecure origins or when blocked).
     */
    function createNotification(title, message) {
      if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notifications.");
        return false;
      }
      try {
        const options = {
          body: message,
          icon: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/af8bc113-d9a4-40cf-9077-06b673c583e0/dl7kpss-efb9b50c-edb4-41ea-ac4e-ca3f93c6c189.png/v1/fit/w_800,h_800/cookie_tappers_icon_by_unknown9394998_dl7kpss-414w-2x.png",
          badge: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/af8bc113-d9a4-40cf-9077-06b673c583e0/dl7kpss-efb9b50c-edb4-41ea-ac4e-ca3f93c6c189.png/v1/fit/w_800,h_800/cookie_tappers_icon_by_unknown9394998_dl7kpss-414w-2x.png",
          vibrate: [200, 100, 200],
          data: { url: window.location.href }
        };
        const notification = new Notification(title, options);
        notification.onclick = (event) => {
          event.preventDefault();
          try { window.focus(); } catch (e) {}
          try { notification.close(); } catch (e) {}
        };
        return true;
      } catch (err) {
        console.warn("Failed to create Notification:", err);
        return false;
      }
    }

    /**
     * Request permission (supports both Promise and callback forms) and show notification if granted.
     * Call this directly from a user gesture (click/keypress handlers).
     */
    function requestPermissionAndNotify(title, message) {
      if (!("Notification" in window)) {
        console.warn("Notifications not supported.");
        // fallback: alert to ensure the user sees the message
        try { alert(title + "\n\n" + message); } catch (e) {}
        return;
      }

      // If already granted, create it immediately
      if (Notification.permission === 'granted') {
        const ok = createNotification(title, message);
        if (!ok) {
          // fallback if notifications are blocked or fail (e.g. insecure origin)
          try { alert(title + "\n\n" + message); } catch (e) {}
        }
        return;
      }

      // Use the callback form and also handle promise form if returned
      const handleResult = (perm) => {
        try {
          if (perm === 'granted') {
            const ok = createNotification(title, message);
            if (!ok) {
              try { alert(title + "\n\n" + message); } catch (e) {}
            }
          } else {
            console.log('Notification permission result:', perm);
            // optional: fallback to alert if denied and you still want to inform the user
          }
        } catch (err) {
          console.error('Error handling permission result:', err);
        }
      };

      try {
        // Some browsers return a Promise, others expect a callback
        const maybePromise = Notification.requestPermission(handleResult);
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(handleResult).catch((err) => {
            console.warn('requestPermission promise rejected:', err);
          });
        }
      } catch (e) {
        // Very old fallback (shouldn't be needed)
        try {
          Notification.requestPermission(function (perm) {
            handleResult(perm);
          });
        } catch (err) {
          console.warn('Notification.requestPermission failed completely:', err);
        }
      }
    }

    // ---------------------------
    // Game variables / elements
    // ---------------------------
    let cookieCount = 0;
    let totalCookies = 0;
    let cookiesPerClick = 1;
    let upgradeCost = 12;
    let pickaxeCost = 100;
    let farmCost = 1100;
    let mineCost = 16000;
    let factoryCost = 130000;
    let bankCost = 870000;
    let templeCost = 20000000;
    let wizardCost = 330000000;

    let autotapCps = 0.2;
    let pickaxeCps = 1.5;
    let farmCps = 7;
    let mineCps = 54;
    let factoryCps = 280;
    let bankCps = 1700;
    let templeCps = 7800;
    let wizardCps = 39000;

    let cookiesPerSecond = 0;
    let lastClickTime = 0;
    let intervalId = null;

    let ownedAutotaps = 0;
    let ownedPickaxes = 0;
    let ownedFarms = 0;
    let ownedMines = 0;
    let ownedFactories = 0;
    let ownedBanks = 0;
    let ownedTemples = 0;
    let ownedWizards = 0;

    // production counters
    let producedAutotaps = 0;
    let producedPickaxes = 0;
    let producedFarms = 0;
    let producedMines = 0;
    let producedFactories = 0;
    let producedBanks = 0;
    let producedTemples = 0;
    let producedWizards = 0;

    let clickCount = 0;
    let basicTapsCost = 400;
    let basicTapsPurchased = false;
    let cursorMultiplier = 1;

    // Keep a single DOM instance of Basic Taps
    let basicTapsItem = null;
    let basicTapsBtn = null;

    const suffixes = ["k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Udc", "Ddc", "Tdc", "Qadc"];
    const cookieEmoji = '🍪';

    // DOM refs
    const loadingScreen = document.querySelector('.loading-screen');
    const container = document.querySelector('.container');
    const usernameContainer = document.querySelector('.username-container');
    const cookieCountElement = document.getElementById('cookie-count');
    const perSecondElement = document.getElementById('per-second');
    const cookieElement = document.getElementById('cookie');
    const upgradeButtonElement = document.getElementById('upgrade-button');
    const pickaxeButtonElement = document.getElementById('pickaxe-button');
    const farmButtonElement = document.getElementById('farm-button');
    const mineButtonElement = document.getElementById('mine-button');
    const factoryButtonElement = document.getElementById('factory-button');
    const bankButtonElement = document.getElementById('bank-button');
    const templeButtonElement = document.getElementById('temple-button');
    const wizardButtonElement = document.getElementById('wizard-button');
    const clickSoundElement = document.getElementById('click-sound');
    const upgradeSoundElement = document.getElementById('upgrade-sound');
    const upgradedSoundElement = document.getElementById('upgraded-sound');
    const userInfoElement = document.querySelector('.user-info');
    const usernameDisplayElement = document.getElementById('username-display');
    const notifyButton = document.getElementById('notify-btn');
    const buildingsButton = document.getElementById('buildings-button');
    const upgradesButton = document.getElementById('upgrades-button');
    const statsButton = document.getElementById('stats-button');
    const changelogButton = document.getElementById('changelog-button');
    const settingsButton = document.getElementById('settings-button');
    const upgradeContainer = document.getElementById('upgrade-container');
    const upgradesContainer = document.getElementById('upgrades-container');
    const upgradesListElement = document.getElementById('upgrades-list');
    const statsContainer = document.getElementById('stats-container');
    const changelogContainer = document.getElementById('changelog-container');
    const settingsContainer = document.getElementById('settings-container');
    const totalCookiesRow = document.getElementById('total-cookies-row');
    const clicksRow = document.getElementById('clicks-row');
    const totalBuildingsRow = document.getElementById('total-buildings-row');
    // New stats rows for Audio & Appearance (not present in HTML by default but safe to query)
    const musicStatRow = document.getElementById('music-stat-row');
    const sfxStatRow = document.getElementById('sfx-stat-row');
    const appearanceStatRow = document.getElementById('appearance-stat-row');

    const musicAudio = document.getElementById('music-audio');
    // theme dropdown elements (replaced the old checkbox switch)
    const themeDropdownRoot = document.getElementById('theme-dropdown');
    const themeDropdownButton = document.getElementById('theme-button');
    const themeDropdownMenu = document.getElementById('themeDropdown');

    // number format dropdown elements
    const numberFormatRoot = document.getElementById('numberformat-dropdown');
    const numberFormatButton = document.getElementById('numberformat-button');
    const numberFormatMenu = document.getElementById('numberformatDropdown');

    const musicVolumeSlider = document.getElementById('music-volume');
    // removed explicit numeric labels for sliders per request
    const sfxVolumeSlider = document.getElementById('sfx-volume');

    // ---------------------------
    // Audio / slider helpers
    // ---------------------------
    function setMusicVolume(val) { if (musicAudio) musicAudio.volume = val / 100; }
    function setSfxVolume(val) {
        if (clickSoundElement) clickSoundElement.volume = val / 100;
        if (upgradeSoundElement) upgradeSoundElement.volume = val / 100;
        if (upgradedSoundElement) upgradedSoundElement.volume = val / 100;
    }

    function updateSliderBackground(slider, fillColor = '#daa8e6', emptyColor = '#ededed') {
        if (!slider) return;
        const val = Number(slider.value);
        slider.style.background = `linear-gradient(90deg, ${fillColor} ${val}%, ${emptyColor} ${val}%)`;
    }

    musicVolumeSlider && musicVolumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        setMusicVolume(value);
        updateSliderBackground(e.target);
    });
    sfxVolumeSlider && sfxVolumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        setSfxVolume(value);
        updateSliderBackground(e.target);
    });

    let musicOn = true;
    function playMusic() { if (!musicAudio) return; musicAudio.play().catch(()=>{}); }
    function pauseMusic() { if (!musicAudio) return; musicAudio.pause(); }
    function enableMusicIfAllowed() { if (musicOn && musicAudio && musicAudio.paused) musicAudio.play().catch(()=>{}); }
    musicAudio && musicAudio.addEventListener('ended', function() { if (musicOn) playMusic(); });
    document.body.addEventListener('click', enableMusicIfAllowed);

    // ---------------------------
    // Number formatting modes
    // ---------------------------
    // modes: "normal" (commas), "engineering" (k, M, B... with colored suffix), "emojis" (emoji suffixes)
    let numberFormatMode = 'normal';
    try { numberFormatMode = localStorage.getItem('cookieClicks_numberFormat') || 'normal'; } catch (e) {}

    const emojiSuffixMap = {
        k: '🥝',   // thousand
        M: '⛏️',   // million
        B: '🪙',   // billion
        T: '🐢',   // trillion
        Qa: '🔱',
        Qi: '⚡',
        Sx: '🔷',
        Sp: '🌟',
        Oc: '🪄',
        No: '🎯',
        Dc: '💎',
        Udc: '🛡️',
        Ddc: '🔥',
        Tdc: '✨',
        Qadc: '🚀'
    };

    // ---------------------------
    // Formatters (updated to respect numberFormatMode)
    // ---------------------------
    function formatNumberEngineering(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const exponent = tier * 3;
            const scale = Math.pow(10, exponent);
            const scaled = number / scale;
            return `${scaled.toFixed(1)}e${exponent}`;
        }
        return Math.floor(number).toLocaleString();
    }
    function formatNumberEngineeringPlain(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const exponent = tier * 3;
            const scale = Math.pow(10, exponent);
            const scaled = number / scale;
            return `${scaled.toFixed(1)}e${exponent}`;
        }
        return Math.floor(number).toLocaleString();
    }

    function formatNumberEmojis(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            const emoji = emojiSuffixMap[suffix] || suffix;
            // keep span for styling if needed
            return `${scaled.toFixed(1)}<span class="num-suffix">${emoji}</span>`;
        }
        return Math.floor(number).toLocaleString();
    }
    function formatNumberEmojisPlain(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            const emoji = emojiSuffixMap[suffix] || suffix;
            return `${scaled.toFixed(1)}${emoji}`;
        }
        return Math.floor(number).toLocaleString();
    }

    function formatNumberNormal(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            return `${scaled.toFixed(1)}<span class="num-suffix">${suffix}</span>`;
        }
        return Math.floor(number).toLocaleString();
    }

    function formatNumberNormalPlain(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            return `${scaled.toFixed(1)}${suffix}`;
        }
        return Math.floor(number).toLocaleString();    
    }

    function formatNumber(number) {
        // returns HTML-friendly string (may include span)
        switch (numberFormatMode) {
            case 'engineering': return formatNumberEngineering(number);
            case 'emojis': return formatNumberEmojis(number);
            default: return formatNumberNormal(number);
        }
    }
    function formatNumberPlain(number) {
        // returns plain text string (no HTML)
        switch (numberFormatMode) {
            case 'engineering': return formatNumberEngineeringPlain(number);
            case 'emojis': return formatNumberEmojisPlain(number);
            default: return formatNumberNormalPlain(number);
        }
    }

    function formatCookieValue(number) {
        // used for values where fractional display is important
        if (numberFormatMode === 'engineering' || numberFormatMode === 'emojis' || numberFormatMode === 'normal' ) {
            if (number >= 1000) return formatNumber(number);
            if (Math.abs(number - Math.round(number)) > 0.0001) return number.toFixed(1);
            return Math.round(number).toLocaleString();
        } else {
            if (Math.abs(number - Math.round(number)) > 0.0001) return number.toFixed(1);
            return Math.round(number).toLocaleString();
        }
    }
    function formatPerSecond(number) {
        // keep same semantics but respect selected mode for large numbers
        if (numberFormatMode === 'engineering' || numberFormatMode === 'emojis' || numberFormatMode === 'normal' ) {
            // if >=1000, formatNumber returns HTML (which perSecondElement expects)
            if (number >= 1000) return formatNumber(number);
            if (Math.abs(number - Math.round(number)) > 0.0001) return number.toFixed(1);
            return Math.round(number).toLocaleString();
        } else {
            if (Math.abs(number - Math.round(number)) > 0.0001) return number.toFixed(1);
            return Math.round(number).toLocaleString();
        }
    }

    // ---------------------------
    // Number animation helpers (robust)
    // ---------------------------
    /**
     * Animate a numeric value shown inside `el` from its current numeric value to `target`.
     * - el: DOM element whose innerHTML will be updated using provided formatter (may include HTML).
     * - target: numeric target value.
     * - opts: { duration (ms), formatter (function number->string/HTML), allowDecrease (bool) }.
     *
     * Important behaviour to avoid flashing:
     * - We keep a canonical last-displayed numeric value on el._displayedValue (integer).
     * - If the new target is lower than the displayed value and allowDecrease is false, we
     *   cancel any running animation and immediately set the displayed value (no downward tween).
     * - While animating, we update el._displayedValue so any later immediate updates can cancel safely.
     */
    function animateNumber(el, target, opts = {}) {
        if (!el) return;
        const duration = (typeof opts.duration === 'number') ? opts.duration : 420;
        const formatter = opts.formatter || (n => formatNumber(Math.floor(n)));
        const allowDecrease = !!opts.allowDecrease;

        // Normalize target to integer for the displayed counter logic
        const targetNum = Math.floor(Number(target) || 0);

        // Determine start: prefer el._displayedValue (the last number we drew),
        // then dataset.value (legacy), then textContent fallback.
        let start = 0;
        if (typeof el._displayedValue === 'number') {
            start = el._displayedValue;
        } else if (el.dataset && el.dataset.value) {
            start = Math.floor(Number(el.dataset.value) || 0);
        } else {
            // try to parse visible text as fallback (strip non-digit except dot and minus)
            const parsed = parseFloat((el.textContent || '').replace(/[^0-9.\-]/g, '')) || 0;
            start = Math.floor(parsed);
        }

        // If target is lower and we don't allow decrease, immediately set the displayed value.
        if (targetNum < start && !allowDecrease) {
            // cancel any ongoing animation
            if (el._animFrame) {
                cancelAnimationFrame(el._animFrame);
                el._animFrame = null;
            }
            el._displayedValue = targetNum;
            if (el.dataset) el.dataset.value = String(targetNum);
            el.innerHTML = formatter(targetNum);
            // subtle immediate highlight to show change (no tween)
            el.classList.add('animating-number');
            setTimeout(() => { el.classList.remove('animating-number'); }, 120);
            return;
        }

        // If no change, still ensure dataset and displayed reflect the target
        if (start === targetNum) {
            el._displayedValue = targetNum;
            if (el.dataset) el.dataset.value = String(targetNum);
            el.innerHTML = formatter(targetNum);
            return;
        }

        // cancel any existing animation
        if (el._animFrame) {
            cancelAnimationFrame(el._animFrame);
            el._animFrame = null;
        }

        const startTime = performance.now();
        el.classList.add('animating-number');

        function easeOutQuad(t) { return t * (2 - t); }

        function step(now) {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = easeOutQuad(t);
            const current = Math.floor(start + (targetNum - start) * eased);
            // update tracked displayed value so future immediate changes can cancel safely
            el._displayedValue = current;
            if (el.dataset) el.dataset.value = String(current);
            el.innerHTML = formatter(current);
            if (t < 1) {
                el._animFrame = requestAnimationFrame(step);
            } else {
                // finalize
                el._displayedValue = targetNum;
                if (el.dataset) el.dataset.value = String(targetNum);
                el.innerHTML = formatter(targetNum);
                el._animFrame = null;
                setTimeout(() => { el.classList.remove('animating-number'); }, 80);
            }
        }
        el._animFrame = requestAnimationFrame(step);
    }

    // ---------------------------
    // Game compute functions
    // ---------------------------
    function computeTotalBuildings() {
        return ownedAutotaps + ownedPickaxes + ownedFarms + ownedMines + ownedFactories + ownedBanks + ownedTemples + ownedWizards;
    }

    function computeCookiesPerSecond() {
        let cps = 0;
        cps += ownedAutotaps * autotapCps;
        cps += ownedPickaxes * pickaxeCps;
        cps += ownedFarms * farmCps;
        cps += ownedMines * mineCps;
        cps += ownedFactories * factoryCps;
        cps += ownedBanks * bankCps;
        cps += ownedTemples * templeCps;
        cps += ownedWizards * wizardCps;
        cookiesPerSecond = cps;
        return cps;
    }

    // ---------------------------
    // Buttons/DOM helpers
    // ---------------------------
    function ensureButtonStructure(btn) {
        if (!btn) return;
        if (btn.querySelector('.cost')) return;
        btn.innerHTML = `<span class="inline-cookie">${cookieEmoji}</span><span class="cost">0</span>`;
    }

    function initUpgradeButtons() {
        ensureButtonStructure(upgradeButtonElement);
        ensureButtonStructure(pickaxeButtonElement);
        ensureButtonStructure(farmButtonElement);
        ensureButtonStructure(mineButtonElement);
        ensureButtonStructure(factoryButtonElement);
        ensureButtonStructure(bankButtonElement);
        ensureButtonStructure(templeButtonElement);
        ensureButtonStructure(wizardButtonElement);

        // apply glowing-btn class to upgrade buttons so hover glow works
        [upgradeButtonElement, pickaxeButtonElement, farmButtonElement, mineButtonElement, factoryButtonElement, bankButtonElement, templeButtonElement, wizardButtonElement].forEach(btn => {
            if (btn && !btn.classList.contains('glowing-btn')) btn.classList.add('glowing-btn');
        });
    }

    // ---------------------------
    // Basic Taps (single element so no animation repeats)
    // ---------------------------
    function createBasicTapsItem() {
        if (basicTapsItem) return basicTapsItem;
        const autotapImg = document.getElementById('autotap-image');

        const item = document.createElement('div');
        item.className = 'upgrade-item';

        const img = document.createElement('img');
        img.src = 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/af8bc113-d9a4-40cf-9077-06b673c583e0/dle3sdl-3d31edb0-df3c-43ef-99b2-03ca34fe3b07.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi9hZjhiYzExMy1kOWE0LTQwY2YtOTA3Ny0wNmI2NzNjNTgzZTAvZGxlM3NkbC0zZDMxZWRiMC1kZjNjLTQzZWYtOTliMi0wM2NhMzRmZTNiMDcucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.22zoHl4d2kfFEa-CIQ9A9OFbeD06-EmPs8qUAMHfz4U';
        img.alt = 'Basic Taps';

        // label is NOT a .tooltip anymore — remove custom floating tooltip and use native title instead.
        const label = document.createElement('div');
        label.className = 'label';
        const strong = document.createElement('strong');
        strong.innerText = 'Basic Taps';
        const subtitle = document.createElement('div');
        subtitle.className = 'subtitle';
        // show same per-second subtitle as other buildings (user requested "+0.2/s")
        subtitle.innerText = 'Clicks and autotaps are 2x more.';
        label.appendChild(strong);
        label.appendChild(subtitle);

        // Use native title attribute for a simple tooltip (no floating overlay)
        label.title = 'Taps and Autotaps are 2x upgraded.';

        const btn = document.createElement('button');
        btn.innerHTML = `<span class="inline-cookie">${cookieEmoji}</span><span class="cost">${formatNumber(Math.floor(basicTapsCost))}</span>`;

        btn.addEventListener('click', () => {
            buyBasicTaps();
            updateUpgradesPanel();
        });

        item.appendChild(img);
        item.appendChild(label);
        item.appendChild(btn);

        basicTapsItem = item;
        basicTapsBtn = btn;
        return item;
    }

    function updateUpgradesPanel() {
        if (!upgradesListElement) return;
        upgradesListElement.innerHTML = '';

        // NEW: hide Basic Taps entirely until the player has at least 1 autotap
        if (!basicTapsPurchased && ownedAutotaps >= 1) {
            const item = createBasicTapsItem();
            upgradesListElement.appendChild(item);
            if (basicTapsBtn) {
                const costSpan = basicTapsBtn.querySelector('.cost');
                if (costSpan) costSpan.innerHTML = formatNumber(Math.floor(basicTapsCost));
            }
            // enable/disable purchase based on current cookies
            if (basicTapsBtn) {
                if (cookieCount < basicTapsCost) {
                    basicTapsBtn.disabled = true;
                    basicTapsBtn.setAttribute('aria-disabled', 'true');
                    basicTapsBtn.style.opacity = '0.6';
                    basicTapsBtn.style.cursor = 'not-allowed';
                } else {
                    basicTapsBtn.disabled = false;
                    basicTapsBtn.setAttribute('aria-disabled', 'false');
                    basicTapsBtn.style.opacity = '';
                    basicTapsBtn.style.cursor = '';
                }
            }
            // ensure tooltip wiring applies to items appended to the upgrades panel as well
            wireTooltipsInBuildings();
            return;
        }

        const nothing = document.createElement('div');
        nothing.className = 'nothing';
        nothing.textContent = `There's nothing here`;
        upgradesListElement.appendChild(nothing);
    }

    // ---------------------------
    // Update display
    // ---------------------------
    function updateDisplay() {
        // Cookie count: we no longer animate the main cookie total — update immediately
        if (cookieCountElement) {
            // ensure container has inline cookie and numeric span
            const existingNumber = cookieCountElement.querySelector('.cookie-number');
            const targetCookies = Math.floor(cookieCount);
            if (!existingNumber) {
                cookieCountElement.innerHTML = `<span class="inline-cookie">${cookieEmoji}</span><span class="cookie-number" data-value="${targetCookies}">${formatNumber(targetCookies)}</span>`;
                const el = cookieCountElement.querySelector('.cookie-number');
                if (el) {
                    el._displayedValue = targetCookies;
                    if (el.dataset) el.dataset.value = String(targetCookies);
                }
            } else {
                // Immediate update (no animation) for main cookie counter
                existingNumber._displayedValue = targetCookies;
                if (existingNumber.dataset) existingNumber.dataset.value = String(targetCookies);
                existingNumber.innerHTML = formatNumber(targetCookies);
            }
        }

        if (perSecondElement) perSecondElement.innerHTML = `${formatPerSecond(cookiesPerSecond)} per second`;

        const labels = [
            { id: 'autotap-label', text: `Autotap: ${ownedAutotaps}`, cps: autotapCps, owned: ownedAutotaps, produced: producedAutotaps, tooltipId: 'autotap-tooltip' },
            { id: 'pickaxe-label', text: `Pickaxe: ${ownedPickaxes}`, cps: pickaxeCps, owned: ownedPickaxes, produced: producedPickaxes, tooltipId: 'pickaxe-tooltip' },
            { id: 'farm-label', text: `Shovel: ${ownedFarms}`, cps: farmCps, owned: ownedFarms, produced: producedFarms, tooltipId: 'farm-tooltip' },
            { id: 'mine-label', text: `Crystal: ${ownedMines}`, cps: mineCps, owned: ownedMines, produced: producedMines, tooltipId: 'mine-tooltip' },
            { id: 'factory-label', text: `Factory: ${ownedFactories}`, cps: factoryCps, owned: ownedFactories, produced: producedFactories, tooltipId: 'factory-tooltip' },
            { id: 'bank-label', text: `Shield: ${ownedBanks}`, cps: bankCps, owned: ownedBanks, produced: producedBanks, tooltipId: 'bank-tooltip' },
            { id: 'temple-label', text: `Temple: ${ownedTemples}`, cps: templeCps, owned: ownedTemples, produced: producedTemples, tooltipId: 'temple-tooltip' },
            { id: 'wizard-label', text: `Gametower: ${ownedWizards}`, cps: wizardCps, owned: ownedWizards, produced: producedWizards, tooltipId: 'wizard-tooltip' },
        ];
        labels.forEach(l => {
            const el = document.getElementById(l.id);
            if (el) {
                const formattedCps = formatPerSecond(l.cps);
                // Build tooltip with dedicated spans for produced values so we can animate them
                const itemTotalCps = l.owned * l.cps;
                const percent = (cookiesPerSecond > 0) ? ((itemTotalCps / cookiesPerSecond) * 100).toFixed(1) : '0.0';
                // produced value (total produced so far) and producing (instant cps contribution)
                const producedVal = Math.floor(l.produced);
                const producingVal = Math.floor(itemTotalCps);

                el.innerHTML = `<strong>${l.text}</strong><span class="subtitle">+${formattedCps}/s</span><span class="tooltiptext" id="${l.tooltipId}">${percent}% of cps<br>🍪<span class="produced-number" data-value="${producedVal}">${formatNumber(producedVal)}</span> produced<br>Producing <span class="producing-number" data-value="${producingVal}">${formatCookieValue(producingVal)}</span>🍪/s</span>`;

                const tooltipEl = document.getElementById(l.tooltipId);
                if (tooltipEl) {
                    // animate produced number and producing number spans
                    const prodSpan = tooltipEl.querySelector('.produced-number');
                    const prodCpsSpan = tooltipEl.querySelector('.producing-number');
                    if (prodSpan) {
                        // produced counters always increase (so allowDecrease=false is fine)
                        animateNumber(prodSpan, producedVal, { duration: 700, formatter: (n) => formatNumber(Math.floor(n)), allowDecrease: false });
                    }
                    if (prodCpsSpan) {
                        // producing may change up or down; we prefer not to animate downward to avoid visual confusion
                        animateNumber(prodCpsSpan, producingVal, { duration: 700, formatter: (n) => formatCookieValue(Math.floor(n)), allowDecrease: false });
                    }
                }
            }
        });

        const setCost = (btn, value) => {
            if (!btn) return;
            const span = btn.querySelector('.cost');
            if (span) {
                span.innerHTML = formatNumber(Math.floor(value));
            } else {
                ensureButtonStructure(btn);
                const s = btn.querySelector('.cost');
                if (s) s.innerHTML = formatNumber(Math.floor(value));
            }
        };

        setCost(upgradeButtonElement, upgradeCost);
        setCost(pickaxeButtonElement, pickaxeCost);
        setCost(farmButtonElement, farmCost);
        setCost(mineButtonElement, mineCost);
        setCost(factoryButtonElement, factoryCost);
        setCost(bankButtonElement, bankCost);
        setCost(templeButtonElement, templeCost);
        setCost(wizardButtonElement, wizardCost);

        if (totalCookiesRow) totalCookiesRow.innerHTML = `${cookieEmoji} ${formatNumber(Math.floor(totalCookies))}`;
        if (clicksRow) clicksRow.innerHTML = `👆 ${formatNumber(Math.floor(clickCount))}`;
        if (totalBuildingsRow) totalBuildingsRow.innerHTML = ` 🏗️ ${formatNumber(Math.floor(computeTotalBuildings()))}`;

        // Update the new Audio & Appearance rows
        if (musicStatRow) {
            const mv = musicVolumeSlider ? musicVolumeSlider.value : '100';
            musicStatRow.innerHTML = `Music: ${mv}`;
        }
        if (sfxStatRow) {
            const sv = sfxVolumeSlider ? sfxVolumeSlider.value : '100';
            sfxStatRow.innerHTML = `SFX: ${sv}`;
        }
        if (appearanceStatRow) {
            const appearance = (document.body.classList.contains('dark-mode')) ? 'Dark' : 'Light';
            appearanceStatRow.innerHTML = appearance;
        }

        updateUpgradesPanel();

        // After DOM updates, ensure tooltip wiring is active
        wireTooltipsInBuildings();
    }

    // ---------------------------
    // Clicker clone + golden cookie
    // ---------------------------
    function createClickerClone(clicks, x, y) {
        const clone = document.createElement('div');
        clone.className = 'clicker-clone';
        clone.innerHTML = `+${formatCookieValue(cookiesPerClick)}`;
        clone.style.top = `${y}px`;
        clone.style.left = `${x}px`;
        document.body.appendChild(clone);
        requestAnimationFrame(() => {
            clone.style.transform = 'translateY(-30px)';
            clone.style.opacity = '0';
        });
        setTimeout(() => {
            if (clone.parentNode) clone.parentNode.removeChild(clone);
        }, 400);
    }

    function createGoldenCookie(x, y) {
        const goldenCookie = document.createElement('img');
        goldenCookie.src = 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/af8bc113-d9a4-40cf-9077-06b673c583e0/dl5xrcg-ca710567-8e32-4fe1-a5dc-0015ee3a93b5.png';
        goldenCookie.className = 'golden-cookie';
        goldenCookie.style.top = `${y}px`;
        goldenCookie.style.left = `${x}px`;
        goldenCookie.addEventListener('click', () => {
            const bonus = 200 + (cookiesPerSecond / 10);
            cookieCount += bonus;
            totalCookies += bonus;
            updateDisplay();
            if (goldenCookie.parentNode) goldenCookie.parentNode.removeChild(goldenCookie);
        });
        document.body.appendChild(goldenCookie);
        setTimeout(() => {
            if (document.body.contains(goldenCookie)) document.body.removeChild(goldenCookie);
        }, 5000);
    }

    // ---------------------------
    // Interval / production
    // ---------------------------
    function startInterval() {
        if (intervalId) clearInterval(intervalId);
        const perTick = 1;
        intervalId = setInterval(() => {
            computeCookiesPerSecond();

            const autoContrib = ownedAutotaps * autotapCps * perTick;
            const pickContrib = ownedPickaxes * pickaxeCps * perTick;
            const farmContrib = ownedFarms * farmCps * perTick;
            const mineContrib = ownedMines * mineCps * perTick;
            const factoryContrib = ownedFactories * factoryCps * perTick;
            const bankContrib = ownedBanks * bankCps * perTick;
            const templeContrib = ownedTemples * templeCps * perTick;
            const wizardContrib = ownedWizards * wizardCps * perTick;

            const totalTick = autoContrib + pickContrib + farmContrib + mineContrib + factoryContrib + bankContrib + templeContrib + wizardContrib;

            cookieCount += totalTick / 10;
            totalCookies += totalTick / 10;

            producedAutotaps += autoContrib / 10;
            producedPickaxes += pickContrib / 10;
            producedFarms += farmContrib / 10;
            producedMines += mineContrib / 10;
            producedFactories += factoryContrib / 10;
            producedBanks += bankContrib / 10;
            producedTemples += templeContrib / 10;
            producedWizards += wizardContrib / 10;

            updateDisplay();
            checkUpgrades();
        }, 1000 / 10);
    }

    function checkUpgrades() {
        if (cookieCount >= 100) { const el = document.getElementById('pickaxe-upgrade'); if (el) el.style.display = 'flex'; }
        if (cookieCount >= 1100) { const el = document.getElementById('farm-upgrade'); if (el) el.style.display = 'flex'; }
        if (cookieCount >= 16000) { const el = document.getElementById('mine-upgrade'); if (el) el.style.display = 'flex'; }
        if (cookieCount >= 130000) { const el = document.getElementById('factory-upgrade'); if (el) el.style.display = 'flex'; }
        if (cookieCount >= 870000) { const el = document.getElementById('bank-upgrade'); if (el) el.style.display = 'flex'; }
        if (cookieCount >= 20000000) { const el = document.getElementById('temple-upgrade'); if (el) el.style.display = 'flex'; }
        if (cookieCount >= 330000000) { const el = document.getElementById('wizard-upgrade'); if (el) el.style.display = 'flex'; }
    }

    // ---------------------------
    // Persistence
    // ---------------------------
    function saveProgress(username) {
        const progress = {
            cookieCount,
            cookiesPerClick,
            cookiesPerSecond,
            upgradeCost,
            pickaxeCost,
            farmCost,
            mineCost,
            factoryCost,
            bankCost,
            templeCost,
            wizardCost,
            ownedAutotaps,
            ownedPickaxes,
            ownedFarms,
            ownedMines,
            ownedFactories,
            ownedBanks,
            ownedTemples,
            ownedWizards,
            totalCookies,
            clickCount,
            basicTapsPurchased,
            autotapCps,
            cursorMultiplier,
            producedAutotaps,
            producedPickaxes,
            producedFarms,
            producedMines,
            producedFactories,
            producedBanks,
            producedTemples,
            producedWizards
        };
        try { localStorage.setItem(`cookieClicks_${username}`, JSON.stringify(progress)); } catch (e) {}
    }

    function loadProgress(username) {
        try {
            const saved = localStorage.getItem(`cookieClicks_${username}`);
            if (saved) {
                const p = JSON.parse(saved);
                cookieCount = p.cookieCount || 0;
                cookiesPerClick = p.cookiesPerClick || 1;
                cookiesPerSecond = p.cookiesPerSecond || 0;
                upgradeCost = p.upgradeCost || upgradeCost;
                pickaxeCost = p.pickaxeCost || pickaxeCost;
                farmCost = p.farmCost || farmCost;
                mineCost = p.mineCost || mineCost;
                factoryCost = p.factoryCost || factoryCost;
                bankCost = p.bankCost || bankCost;
                templeCost = p.templeCost || templeCost;
                wizardCost = p.wizardCost || wizardCost;
                ownedAutotaps = p.ownedAutotaps || 0;
                ownedPickaxes = p.ownedPickaxes || 0;
                ownedFarms = p.ownedFarms || 0;
                ownedMines = p.ownedMines || 0;
                ownedFactories = p.ownedFactories || 0;
                ownedBanks = p.ownedBanks || 0;
                ownedTemples = p.ownedTemples || 0;
                ownedWizards = p.ownedWizards || 0;
                totalCookies = p.totalCookies || cookieCount;
                clickCount = p.clickCount || 0;
                basicTapsPurchased = p.basicTapsPurchased || false;
                autotapCps = (typeof p.autotapCps !== 'undefined') ? p.autotapCps : autotapCps;
                cursorMultiplier = (typeof p.cursorMultiplier !== 'undefined') ? p.cursorMultiplier : cursorMultiplier;

                producedAutotaps = p.producedAutotaps || 0;
                producedPickaxes = p.producedPickaxes || 0;
                producedFarms = p.producedFarms || 0;
                producedMines = p.producedMines || 0;
                producedFactories = p.producedFactories || 0;
                producedBanks = p.producedBanks || 0;
                producedTemples = p.producedTemples || 0;
                producedWizards = p.producedWizards || 0;
            }
        } catch (e) {}
        computeCookiesPerSecond();
        updateDisplay();
        startInterval();
    }

    // ---------------------------
    // SFX playback helper
    // ---------------------------
    function playSfx(baseAudioElement) {
        if (!baseAudioElement) return;
        try {
            const sfx = baseAudioElement.cloneNode(true);
            sfx.volume = baseAudioElement.volume;
            if (sfx.readyState >= 2) sfx.currentTime = 0;
            sfx.play().catch(() => {});
            sfx.addEventListener('ended', () => { if (sfx.parentNode) sfx.parentNode.removeChild(sfx); });
            sfx.style.position = 'absolute';
            sfx.style.left = '-9999px';
            document.body.appendChild(sfx);
        } catch (err) {
            try {
                baseAudioElement.currentTime = 0;
                baseAudioElement.play().catch(() => {});
            } catch (e) {}
        }
    }

    // ---------------------------
    // Event handlers for click & buys
    // ---------------------------
    if (cookieElement) {
        cookieElement.addEventListener('click', (event) => {
            const now = Date.now();
            if (now - lastClickTime >= 10) {
                lastClickTime = now;
                cookieCount += cookiesPerClick;
                totalCookies += cookiesPerClick;
                clickCount += 1;
                createClickerClone(cookiesPerClick, event.clientX, event.clientY);
                updateDisplay();
                playSfx(clickSoundElement);
            }
        });
    }

    upgradeButtonElement && upgradeButtonElement.addEventListener('click', () => {
        if (cookieCount >= upgradeCost) {
            cookieCount -= upgradeCost;
            ownedAutotaps++;
            upgradeCost = Math.round(upgradeCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay(); // immediate update; main counter no longer animates
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    pickaxeButtonElement && pickaxeButtonElement.addEventListener('click', () => {
        if (cookieCount >= pickaxeCost) {
            cookieCount -= pickaxeCost;
            ownedPickaxes++;
            pickaxeCost = Math.round(pickaxeCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    farmButtonElement && farmButtonElement.addEventListener('click', () => {
        if (cookieCount >= farmCost) {
            cookieCount -= farmCost;
            ownedFarms++;
            farmCost = Math.round(farmCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    mineButtonElement && mineButtonElement.addEventListener('click', () => {
        if (cookieCount >= mineCost) {
            cookieCount -= mineCost;
            ownedMines++;
            mineCost = Math.round(mineCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    factoryButtonElement && factoryButtonElement.addEventListener('click', () => {
        if (cookieCount >= factoryCost) {
            cookieCount -= factoryCost;
            ownedFactories++;
            factoryCost = Math.round(factoryCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    bankButtonElement && bankButtonElement.addEventListener('click', () => {
        if (cookieCount >= bankCost) {
            cookieCount -= bankCost;
            ownedBanks++;
            bankCost = Math.round(bankCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    templeButtonElement && templeButtonElement.addEventListener('click', () => {
        if (cookieCount >= templeCost) {
            cookieCount -= templeCost;
            ownedTemples++;
            templeCost = Math.round(templeCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    wizardButtonElement && wizardButtonElement.addEventListener('click', () => {
        if (cookieCount >= wizardCost) {
            cookieCount -= wizardCost;
            ownedWizards++;
            wizardCost = Math.round(wizardCost * 1.1);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    // ---------------------------
    // buyBasicTaps
    // ---------------------------
    function buyBasicTaps() {
        if (basicTapsPurchased) return;

        if (cookieCount < basicTapsCost) {
            return;
        }

        cookieCount -= basicTapsCost;
        cookiesPerClick *= 2;
        autotapCps *= 2;
        cursorMultiplier = 2;
        basicTapsPurchased = true;

        computeCookiesPerSecond();
        updateDisplay();
        updateUpgradesPanel();
        playSfx(upgradedSoundElement);
    }

    // ---------------------------
    // UI: dark mode (now via dropdown), tabs, username flow (Notification API used for "Welcome")
    // ---------------------------
    function setDarkMode(enabled) {
        if (enabled) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');

        // update dropdown label & aria attributes
        if (themeDropdownButton) {
            themeDropdownButton.textContent = `${enabled ? 'Dark🔻' : 'Light🔻'}`;
            themeDropdownButton.setAttribute('aria-expanded', 'false');
        }
        try {
            localStorage.setItem('cookieClicks_darkMode', enabled ? '1' : '0');
        } catch (e) {}
    }
    (function initDarkModeFromStorage() {
        try {
            const val = localStorage.getItem('cookieClicks_darkMode');
            const enabled = val === '1';
            setDarkMode(enabled);
        } catch (e) {}
    })();

    // Theme dropdown interactions (replace the old checkbox)
    if (themeDropdownRoot && themeDropdownButton && themeDropdownMenu) {
        // toggle menu
        themeDropdownButton.addEventListener('click', (e) => {
            const open = themeDropdownRoot.classList.toggle('open');
            themeDropdownButton.setAttribute('aria-expanded', open ? 'true' : 'false');
            themeDropdownMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
        });

        // handle option selection (buttons inside menu)
        themeDropdownMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-theme]');
            if (!btn) return;
            const theme = btn.getAttribute('data-theme');
            if (theme === 'dark') {
                setDarkMode(true);
            } else {
                setDarkMode(false);
            }
            // close menu
            themeDropdownRoot.classList.remove('open');
            themeDropdownButton.setAttribute('aria-expanded', 'false');
            themeDropdownMenu.setAttribute('aria-hidden', 'true');
            updateDisplay();
        });

        // keyboard accessibility
        themeDropdownButton.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                themeDropdownRoot.classList.add('open');
                themeDropdownMenu.setAttribute('aria-hidden', 'false');
                themeDropdownButton.setAttribute('aria-expanded', 'true');
                const first = themeDropdownMenu.querySelector('[data-theme]');
                if (first) first.focus();
            }
        });

        themeDropdownMenu.addEventListener('keydown', (e) => {
            const items = Array.from(themeDropdownMenu.querySelectorAll('[data-theme]'));
            const idx = items.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = items[(idx + 1) % items.length];
                if (next) next.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = items[(idx - 1 + items.length) % items.length];
                if (prev) prev.focus();
            } else if (e.key === 'Escape') {
                themeDropdownRoot.classList.remove('open');
                themeDropdownButton.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.activeElement.click();
            }
        });

        // close when clicking outside
        document.addEventListener('click', (ev) => {
            if (!ev.target.closest || (!ev.target.closest('.dropdown'))) {
                themeDropdownRoot.classList.remove('open');
                themeDropdownButton.setAttribute('aria-expanded', 'false');
                themeDropdownMenu.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // ---------------------------
    // Number format dropdown interactions
    // ---------------------------
    (function initNumberFormatDropdown() {
        // initialize label on button
        if (numberFormatButton) {
            const label = numberFormatMode === 'engineering' ? 'Engineering🔻' : (numberFormatMode === 'emojis' ? 'Emojis🔻' : 'Normal🔻');
            numberFormatButton.textContent = `${label}`;
        }

        if (!numberFormatRoot || !numberFormatButton || !numberFormatMenu) return;

        numberFormatButton.addEventListener('click', (e) => {
            const open = numberFormatRoot.classList.toggle('open');
            numberFormatButton.setAttribute('aria-expanded', open ? 'true' : 'false');
            numberFormatMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
        });

        numberFormatMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-format]');
            if (!btn) return;
            const fmt = btn.getAttribute('data-format');
            if (!fmt) return;
            numberFormatMode = fmt;
            try { localStorage.setItem('cookieClicks_numberFormat', numberFormatMode); } catch (err) {}
            numberFormatButton.textContent = (fmt === 'engineering') ? 'Engineering🔻' : (fmt === 'emojis' ? 'Emojis🔻' : 'Normal🔻');

            // close menu
            numberFormatRoot.classList.remove('open');
            numberFormatButton.setAttribute('aria-expanded', 'false');
            numberFormatMenu.setAttribute('aria-hidden', 'true');

            // refresh UI with new format
            updateDisplay();
        });

        // keyboard accessibility
        numberFormatButton.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                numberFormatRoot.classList.add('open');
                numberFormatMenu.setAttribute('aria-hidden', 'false');
                numberFormatButton.setAttribute('aria-expanded', 'true');
                const first = numberFormatMenu.querySelector('[data-format]');
                if (first) first.focus();
            }
        });

        numberFormatMenu.addEventListener('keydown', (e) => {
            const items = Array.from(numberFormatMenu.querySelectorAll('[data-format]'));
            const idx = items.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = items[(idx + 1) % items.length];
                if (next) next.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = items[(idx - 1 + items.length) % items.length];
                if (prev) prev.focus();
            } else if (e.key === 'Escape') {
                numberFormatRoot.classList.remove('open');
                numberFormatButton.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.activeElement.click();
            }
        });

        // close when clicking outside (separate handler to avoid interfering with theme dropdown)
        document.addEventListener('click', (ev) => {
            if (!ev.target.closest || (!ev.target.closest('.dropdown'))) {
                numberFormatRoot.classList.remove('open');
                numberFormatButton.setAttribute('aria-expanded', 'false');
                numberFormatMenu.setAttribute('aria-hidden', 'true');
            }
        });
    })();

    function clearSelectedTabs() {
        [buildingsButton, upgradesButton, statsButton, changelogButton, settingsButton].forEach(btn => {
            if (btn) { btn.classList.remove('selected'); btn.setAttribute('aria-pressed', 'false'); }
        });
    }
    function hideAllPanels() {
        if (upgradeContainer) upgradeContainer.style.display = 'none';
        if (upgradesContainer) upgradesContainer.style.display = 'none';
        if (statsContainer) statsContainer.style.display = 'none';
        if (changelogContainer) changelogContainer.style.display = 'none';
        if (settingsContainer) settingsContainer.style.display = 'none';
    }
    function showTab(tabName) {
        hideAllPanels();
        clearSelectedTabs();
        switch (tabName) {
            case 'buildings': if (upgradeContainer) upgradeContainer.style.display = 'flex'; if (buildingsButton) { buildingsButton.classList.add('selected'); buildingsButton.setAttribute('aria-pressed','true'); } break;
            case 'upgrades': if (upgradesContainer) upgradesContainer.style.display = 'flex'; if (upgradesButton) { upgradesButton.classList.add('selected'); upgradesButton.setAttribute('aria-pressed','true'); } break;
            case 'stats': if (statsContainer) statsContainer.style.display = 'flex'; if (statsButton) { statsButton.classList.add('selected'); statsButton.setAttribute('aria-pressed','true'); } break;
            case 'changelog': if (changelogContainer) changelogContainer.style.display = 'flex'; if (changelogButton) { changelogButton.classList.add('selected'); changelogButton.setAttribute('aria-pressed','true'); } break;
            case 'settings': if (settingsContainer) settingsContainer.style.display = 'flex'; if (settingsButton) { settingsButton.classList.add('selected'); settingsButton.setAttribute('aria-pressed','true'); } break;
        }
    }
    buildingsButton && buildingsButton.addEventListener('click', () => showTab('buildings'));
    upgradesButton && upgradesButton.addEventListener('click', () => showTab('upgrades'));
    statsButton && statsButton.addEventListener('click', () => showTab('stats'));
    changelogButton && changelogButton.addEventListener('click', () => showTab('changelog'));
    settingsButton && settingsButton.addEventListener('click', () => showTab('settings'));

    const segButtons = [buildingsButton, upgradesButton, statsButton, changelogButton, settingsButton].filter(Boolean);
    segButtons.forEach((btn, idx) => {
        btn.tabIndex = 0;
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                const next = segButtons[(idx + 1) % segButtons.length]; next && next.focus(); next && next.click();
            } else if (e.key === 'ArrowLeft') {
                const prev = segButtons[(idx - 1 + segButtons.length) % segButtons.length]; prev && prev.focus(); prev && prev.click();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); btn.click();
            }
        });
    });

    showTab('buildings');

    setTimeout(() => {
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (usernameContainer) usernameContainer.style.display = 'block';
        if (musicAudio) musicAudio.pause();
    }, 2000);

    const usernameInput = document.querySelector('.username-container input');

    // Floating label behavior: toggle .has-value on wrapper
    (function wireFloatingLabel() {
        const wrapper = document.querySelector('.username-container .input-wrapper');
        if (!usernameInput || !wrapper) return;
        const update = () => {
            if (usernameInput.value && usernameInput.value.trim() !== '') wrapper.classList.add('has-value');
            else wrapper.classList.remove('has-value');
        };
        usernameInput.addEventListener('input', update);
        usernameInput.addEventListener('blur', update);
        usernameInput.addEventListener('focus', () => wrapper.classList.add('has-value'));
        // initialize
        update();
    })();

    async function enterGame(usernameRaw) {
        let username = (usernameRaw || '').trim();
        if (!username || username.match(/^\s*$/)) {
            username = `player${Math.floor(Math.random() * 1000000000)}`;
        }
        username = username.replace(/[^a-zA-Z0-9_.]/g, '');
        if (!username) return;

        if (usernameContainer) usernameContainer.style.display = 'none';
        if (container) container.style.display = 'block';
        if (userInfoElement) userInfoElement.style.display = 'flex';
        if (usernameDisplayElement) usernameDisplayElement.textContent = username;

        // If permission is already granted, show the native notification immediately
        if ("Notification" in window && Notification.permission === 'granted') {
            createNotification('Notification', 'Welcome!');
        }

        loadProgress(username);
        if (musicAudio) musicAudio.play().catch(()=>{});
    }

    // Use the Notification API on Enter (user gesture). Title "Notification", message "Welcome!"
    usernameInput && usernameInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            const val = usernameInput ? usernameInput.value || '' : '';
            // Request notification permission & show welcome notification (must be from user gesture)
            requestPermissionAndNotify('Notification', 'Welcome!');
            await enterGame(val);
        }
    });

    notifyButton && notifyButton.addEventListener('click', async () => {
        const val = usernameInput ? usernameInput.value || '' : '';
        // Request notification permission & show welcome notification (must be from user gesture)
        requestPermissionAndNotify('Notification', 'Welcome!');
        await enterGame(val);
    });

    // Auto-save every 3s if username input has a value
    setInterval(() => {
        try {
            const username = usernameInput ? usernameInput.value.trim() : '';
            if (username) saveProgress(username);
        } catch (e) {}
    }, 3000);

    // Initialize stable button structure to avoid hover flicker
    initUpgradeButtons();

    // ---------------------------
    // Tooltip behavior: fixed-position placement + robust wiring
    // ---------------------------
    function showTooltipForWrapper(wrapper) {
        if (!wrapper) return;
        const tooltipEl = wrapper.querySelector('.tooltiptext');
        if (!tooltipEl) return;

        // Temporarily make measurable
        tooltipEl.classList.add('tooltip-visible');
        tooltipEl.style.visibility = 'hidden';
        tooltipEl.style.display = 'block';

        // mark as fixed and measure
        tooltipEl.classList.add('fixed-position');
        const tw = tooltipEl.offsetWidth;
        const th = tooltipEl.offsetHeight;

        // Find the related image: first try to find an img inside wrapper; otherwise, find an img within the same .upgrade-item
        let img = wrapper.querySelector('img');
        if (!img) {
            const parent = wrapper.closest('.upgrade-item');
            img = parent ? parent.querySelector('img') : null;
        }
        const anchorRect = img ? img.getBoundingClientRect() : wrapper.getBoundingClientRect();

        // compute left (centered)
        let left = Math.round(anchorRect.left + (anchorRect.width / 2) - (tw / 2));
        const pad = 8;
        if (left < pad) left = pad;
        if (left + tw > window.innerWidth - pad) left = window.innerWidth - pad - tw;

        // compute top (below or above)
        const spaceBelow = window.innerHeight - anchorRect.bottom;
        let top = Math.round(anchorRect.bottom + 8);
        if (spaceBelow < th + 12) {
            top = Math.round(anchorRect.top - th - 8);
            if (top < pad) top = pad;
        }

        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = top + 'px';
        tooltipEl.style.visibility = 'visible';
        tooltipEl.style.display = 'block';
        tooltipEl.classList.add('tooltip-visible');

        wrapper._activeTooltip = tooltipEl;
    }

    function hideTooltipForWrapper(wrapper) {
        if (!wrapper) return;
        const tooltipEl = wrapper._activeTooltip || wrapper.querySelector('.tooltiptext');
        if (!tooltipEl) return;

        tooltipEl.classList.remove('tooltip-visible', 'fixed-position');
        tooltipEl.style.left = '';
        tooltipEl.style.top = '';
        tooltipEl.style.visibility = '';
        tooltipEl.style.display = '';
        wrapper._activeTooltip = null;
    }

    function wireTooltipsInBuildings() {
        // Wire tooltips within both the main upgrade container and the upgrades list (basic taps lives in upgrades-container)
        const containers = [];
        if (upgradeContainer) containers.push(upgradeContainer);
        if (upgradesContainer) containers.push(upgradesContainer);

        containers.forEach((containerEl) => {
            const wrappers = containerEl.querySelectorAll('.tooltip');
            wrappers.forEach(w => {
                // find associated img: either inside wrapper or within same upgrade-item
                let img = w.querySelector('img');
                if (!img) {
                    const parent = w.closest('.upgrade-item');
                    img = parent ? parent.querySelector('img') : null;
                }
                if (!img) return;

                // Ensure keyboard accessibility
                if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0');

                // Remove previous handlers if present
                img.removeEventListener('mouseenter', w._enterHandler || (()=>{}));
                img.removeEventListener('mouseleave', w._leaveHandler || (()=>{}));
                img.removeEventListener('focus', w._focusHandler || (()=>{}));
                img.removeEventListener('blur', w._blurHandler || (()=>{}));
                img.removeEventListener('touchstart', w._touchHandler || (()=>{}));

                const open = () => {
                    // hide other tooltips across both containers to prevent overlaps/loops
                    document.querySelectorAll('.tooltip').forEach(other => {
                        if (other !== w) hideTooltipForWrapper(other);
                    });
                    showTooltipForWrapper(w);
                };
                const close = () => hideTooltipForWrapper(w);

                w._enterHandler = open;
                w._leaveHandler = close;
                w._focusHandler = open;
                w._blurHandler = close;
                w._touchHandler = function (ev) {
                    if (!w._touchedOpen) {
                        ev.preventDefault();
                        open();
                        w._touchedOpen = true;
                        setTimeout(() => { w._touchedOpen = false; }, 1200);
                    }
                };

                img.addEventListener('mouseenter', w._enterHandler);
                img.addEventListener('mouseleave', w._leaveHandler);
                img.addEventListener('focus', w._focusHandler);
                img.addEventListener('blur', w._blurHandler);
                img.addEventListener('touchstart', w._touchHandler, { passive: false });
            });
        });

        // Close tooltips when clicking outside
        document.removeEventListener('click', document._tooltipOutsideHandler);
        document._tooltipOutsideHandler = function (e) {
            if (!e.target.closest('.tooltip') && !e.target.closest('.tooltiptext')) {
                document.querySelectorAll('.tooltip').forEach(w => hideTooltipForWrapper(w));
            }
        };
        document.addEventListener('click', document._tooltipOutsideHandler);
    }

    // Wire initially; updateDisplay will call again after DOM updates
    wireTooltipsInBuildings();

    // ---------------------------
    // Start interval & title updater
    // ---------------------------
    startInterval();
    setInterval(() => { document.title = `Cookie Tappers: ${formatNumberPlain(Math.floor(cookieCount))}🍪`; }, 1000);

    if (musicVolumeSlider) { setMusicVolume(musicVolumeSlider.value); updateSliderBackground(musicVolumeSlider); }
    if (sfxVolumeSlider) { setSfxVolume(sfxVolumeSlider.value); updateSliderBackground(sfxVolumeSlider); }

    computeCookiesPerSecond();
    updateDisplay();

    // Expose helpers for debugging
    window.__cookieTappers = {
        formatCookieValue,
        wireTooltipsInBuildings,
        showTooltipForWrapper,
        hideTooltipForWrapper,
        createNotification,
        requestPermissionAndNotify,
        animateNumber
    };
});
