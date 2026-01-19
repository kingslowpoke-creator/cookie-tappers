// Full script.js — game logic plus robust tooltip behavior (fixed-position bubble)
// so hovering or focusing a building image always shows the tooltip.

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
        console.warn("Notifications not supported");
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
    let upgradeCost = 15;
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

    const suffixes = ["k", "m", "b", "t", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Udc", "Ddc", "Tdc", "Qadc"];
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
    const musicAudio = document.getElementById('music-audio');
    const darkCheckbox = document.getElementById('dark-toggle');
    const musicVolumeSlider = document.getElementById('music-volume');
    const musicVolumeVal = document.getElementById('music-volume-val');
    const sfxVolumeSlider = document.getElementById('sfx-volume');
    const sfxVolumeVal = document.getElementById('sfx-volume-val');

    // ---------------------------
    // Audio / slider helpers
    // ---------------------------
    function setMusicVolume(val) { if (musicAudio) musicAudio.volume = val / 100; }
    function setSfxVolume(val) {
        if (clickSoundElement) clickSoundElement.volume = val / 100;
        if (upgradeSoundElement) upgradeSoundElement.volume = val / 100;
    }

    function updateSliderBackground(slider, fillColor = '#daa8e6', emptyColor = '#ededed') {
        if (!slider) return;
        const val = Number(slider.value);
        slider.style.background = `linear-gradient(90deg, ${fillColor} ${val}%, ${emptyColor} ${val}%)`;
    }

    musicVolumeSlider && musicVolumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        musicVolumeVal.textContent = value;
        setMusicVolume(value);
        updateSliderBackground(e.target);
    });
    sfxVolumeSlider && sfxVolumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        sfxVolumeVal.textContent = value;
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
    // Formatters
    // ---------------------------
    function formatNumber(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            return `${scaled.toFixed(2)}<span class="num-suffix">${suffix}</span>`;
        }
        return Math.floor(number).toLocaleString();
    }
    function formatNumberPlain(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            return `${scaled.toFixed(2)}${suffix}`;
        }
        return Math.floor(number).toLocaleString();
    }
    function formatCookieValue(number) {
        if (number >= 1000) return formatNumber(number);
        if (Math.abs(number - Math.round(number)) > 0.0001) return number.toFixed(1);
        return Math.round(number).toLocaleString();
    }
    function formatPerSecond(number) {
        return formatCookieValue(number);
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
        img.src = autotapImg ? autotapImg.src : '';
        img.alt = 'Basic Taps';

        const label = document.createElement('div');
        label.className = 'label';
        const strong = document.createElement('strong');
        strong.innerText = 'Basic Taps';
        const subtitle = document.createElement('div');
        subtitle.className = 'subtitle';
        subtitle.innerText = 'Clicks and Autotaps are worth 2x more';
        label.appendChild(strong);
        label.appendChild(subtitle);

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

        if (!basicTapsPurchased) {
            const item = createBasicTapsItem();
            upgradesListElement.appendChild(item);
            if (basicTapsBtn) {
                const costSpan = basicTapsBtn.querySelector('.cost');
                if (costSpan) costSpan.innerHTML = formatNumber(Math.floor(basicTapsCost));
            }
            if (ownedAutotaps < 1) {
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
            return;
        }

        const nothing = document.createElement('div');
        nothing.className = 'nothing';
        nothing.textContent = `There's nothing here...`;
        upgradesListElement.appendChild(nothing);
    }

    // ---------------------------
    // Update display
    // ---------------------------
    function updateDisplay() {
        if (cookieCountElement) cookieCountElement.innerHTML = `<span class="inline-cookie">${cookieEmoji}</span>${formatNumber(cookieCount)}`;
        if (perSecondElement) perSecondElement.innerHTML = `cps: ${formatPerSecond(cookiesPerSecond)}`;

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
                el.innerHTML = `<strong>${l.text}</strong><span class="subtitle">+${formattedCps}/s</span><span class="tooltiptext" id="${l.tooltipId}">0.00% of cps<br>0 produced so far</span>`;
                const tooltipEl = document.getElementById(l.tooltipId);
                if (tooltipEl) {
                    const itemTotalCps = l.owned * l.cps;
                    const percent = (cookiesPerSecond > 0) ? ((itemTotalCps / cookiesPerSecond) * 100).toFixed(1) : '0.0';
                    tooltipEl.innerHTML = `${percent}% of cps<br>🍪${formatNumber(Math.floor(l.produced))} produced`;
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
        const perTick = 1 / 10;
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

            cookieCount += totalTick;
            totalCookies += totalTick;

            producedAutotaps += autoContrib;
            producedPickaxes += pickContrib;
            producedFarms += farmContrib;
            producedMines += mineContrib;
            producedFactories += factoryContrib;
            producedBanks += bankContrib;
            producedTemples += templeContrib;
            producedWizards += wizardContrib;

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
            upgradeCost = Math.round(upgradeCost * 1.12);
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    pickaxeButtonElement && pickaxeButtonElement.addEventListener('click', () => {
        if (cookieCount >= pickaxeCost) {
            cookieCount -= pickaxeCost;
            ownedPickaxes++;
            pickaxeCost = Math.round(pickaxeCost * 1.12);
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
            farmCost = Math.round(farmCost * 1.12);
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
            mineCost = Math.round(mineCost * 1.12);
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
            factoryCost = Math.round(factoryCost * 1.12);
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
            bankCost = Math.round(bankCost * 1.12);
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
            templeCost = Math.round(templeCost * 1.12);
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
            wizardCost = Math.round(wizardCost * 1.12);
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
        playSfx(upgradeSoundElement);
    }

    // ---------------------------
    // UI: dark mode, tabs, username flow (Notification API used for "Welcome")
    // ---------------------------
    function setDarkMode(enabled) {
        if (enabled) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
        try {
            if (darkCheckbox) darkCheckbox.checked = enabled;
            if (darkCheckbox) darkCheckbox.setAttribute('aria-checked', enabled ? 'true' : 'false');
            localStorage.setItem('cookieClicks_darkMode', enabled ? '1' : '0');
        } catch (e) {}
    }
    (function initDarkModeFromStorage() {
        try {
            const val = localStorage.getItem('cookieClicks_darkMode');
            const enabled = val === '1';
            if (darkCheckbox) darkCheckbox.checked = enabled;
            setDarkMode(enabled);
        } catch (e) {}
    })();
    darkCheckbox && darkCheckbox.addEventListener('change', (e) => setDarkMode(e.target.checked));

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

        const img = wrapper.querySelector('img');
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
        if (!upgradeContainer) return;
        const wrappers = upgradeContainer.querySelectorAll('.tooltip');
        wrappers.forEach(w => {
            const img = w.querySelector('img');
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
    setInterval(() => { document.title = `${formatNumberPlain(Math.floor(cookieCount))} cookies`; }, 1000);

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
        requestPermissionAndNotify
    };
});
