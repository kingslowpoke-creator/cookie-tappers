document.addEventListener('DOMContentLoaded', function () {
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
          icon: "https://example.com/icon.png",
          badge: "https://example.com/badge.png",
          vibrate: [200, 100, 200],
          data: { url: window.location.href }
        };
        const notification = new Notification(title, options);
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
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
        return;
      }

      // If already granted, create it immediately
      if (Notification.permission === 'granted') {
        if (!createNotification(title, message)) {
          // fallback if notifications are blocked or fail (e.g. insecure origin)
          alert(`${title}\n\n${message}`);
        }
        return;
      }

      // Use the callback form and also handle promise form if returned
      const handleResult = (perm) => {
        try {
          if (perm === 'granted') {
            const ok = createNotification(title, message);
            if (!ok) {
              alert(`${title}\n\n${message}`);
            }
          } else {
            console.log('Notification permission result:', perm);
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

    // --- Variables ---
    let cookieCount = 0;
    let totalCookies = 0;
    let cookiesPerClick = 1; // fixed base click value (no automatic scaling by CPS)
    let upgradeCost = 15;
    let pickaxeCost = 100;
    let farmCost = 1100;
    let mineCost = 16000;
    let factoryCost = 130000;
    let bankCost = 870000;
    let templeCost = 20000000;
    let wizardCost = 330000000;

    // Building base cps values (these represent the per-building cps)
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
    let maxUpgradeReached = false;

    let ownedAutotaps = 0;
    let ownedPickaxes = 0;
    let ownedFarms = 0;
    let ownedMines = 0;
    let ownedFactories = 0;
    let ownedBanks = 0;
    let ownedTemples = 0;
    let ownedWizards = 0;

    // New: clicks counter (increments each time player clicks the cookie)
    let clickCount = 0;

    // Basic Taps upgrade
    let basicTapsCost = 400;
    let basicTapsPurchased = false;

    // New: cursor multiplier (1x by default)
    let cursorMultiplier = 1;

    const suffixes = ["k", "m", "b", "t", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Udc", "Ddc", "Tdc", "Qadc"];

    // Use the image URL you requested as the cookie icon for buttons only.
    // For the numeric counters we will show a 🍪 emoji as requested.
    const cookieImageForButtons = `<img class="inline-cookie" src="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/af8bc113-d9a4-40cf-9077-06b673c583e0/dl0n5e1-7f8a7443-3e72-4878-b1ec-0741fb022c86.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi9hZjhiYzExMy1kOWE0LTQwY2YtOTA3Ny0wNmI2NzNjNTgzZTAvZGwwbjVlMS03ZjhhNzQ0My0zZTcyLTQ4NzgtYjFlYy0wNzQxZmIwMjJjODYucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.2LafT9kIKBp0uDpf7_g9O_a2F2O9ZqH6EaJfCgxTG48" alt="cookie">`;
    const cookieEmoji = '🍪';

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
    const continueButton = document.getElementById('continue-button');
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
    // New stats rows:
    const clicksRow = document.getElementById('clicks-row');
    const totalBuildingsRow = document.getElementById('total-buildings-row');

    const musicAudio = document.getElementById('music-audio');
    // dark toggle: now targets the new theme switch checkbox
    const darkCheckbox = document.getElementById('dark-toggle');

    // --- Volume Logic ---
    const musicVolumeSlider = document.getElementById('music-volume');
    const musicVolumeVal = document.getElementById('music-volume-val');
    const sfxVolumeSlider = document.getElementById('sfx-volume');
    const sfxVolumeVal = document.getElementById('sfx-volume-val');

    function setMusicVolume(val) {
        if (musicAudio) musicAudio.volume = val / 100;
    }
    function setSfxVolume(val) {
        if (clickSoundElement) clickSoundElement.volume = val / 100;
        if (upgradeSoundElement) upgradeSoundElement.volume = val / 100;
    }

    // update slider track background to show filled portion (colored) + remainder grey
    function updateSliderBackground(slider, fillColor = '#daa8e6', emptyColor = '#ededed') {
        if (!slider) return;
        const val = Number(slider.value);
        // When val is 0 it will be all grey; when 100 all filled
        slider.style.background = `linear-gradient(90deg, ${fillColor} ${val}%, ${emptyColor} ${val}%)`;
    }

    // bind slider inputs and update backgrounds
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
    function playMusic() {
        if (!musicAudio) return;
        musicAudio.play().catch(() => { /* ignore autoplay errors */ });
    }
    function pauseMusic() {
        if (!musicAudio) return;
        musicAudio.pause();
    }
    function enableMusicIfAllowed() {
        if (musicOn && musicAudio && musicAudio.paused) {
            musicAudio.play().catch(() => {});
        }
    }
    musicAudio && musicAudio.addEventListener('ended', function() {
        if (musicOn) playMusic();
    });
    document.body.addEventListener('click', enableMusicIfAllowed);

    // Helper to format numbers for display
    // NOTE: suffix (k,m,b...) will be wrapped in <span class="num-suffix"> so
    // it can be colored differently in CSS (light/dark).
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
    
    // Plain-text formatter for use in document.title and other text-only contexts
    function formatNumberPlain(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            if (tier === 0) return Math.floor(number).toLocaleString();
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            // Use uppercase suffix for tab clarity (optional)
            return `${scaled.toFixed(2)}${suffix}`;
        }
        return Math.floor(number).toLocaleString();
    }

    function formatPerSecond(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            return `${scaled.toFixed(2)}<span class="num-suffix">${suffix}</span>`;
        } else if (number >= 1000) {
            return Math.floor(number).toLocaleString();
        } else {
            return number.toFixed(1);
        }
    }
    function formatPerClick(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            return `${scaled.toFixed(2)}<span class="num-suffix">${suffix}</span>`;
        } else if (number >= 1000) {
            return Math.floor(number).toLocaleString();
        } else {
            return number.toFixed(1);
        }
    }
    // Plain-text per-click used for document.title when we want plain text
    function formatPerClickPlain(number) {
        if (number >= 1000) {
            const tier = Math.floor(Math.log10(number) / 3);
            const suffix = suffixes[tier - 1] || '';
            const scale = Math.pow(10, tier * 3);
            const scaled = number / scale;
            return `${scaled.toFixed(2)}${suffix}`;
        }
        return number.toFixed(1);
    }

    function computeTotalBuildings() {
        return ownedAutotaps + ownedPickaxes + ownedFarms + ownedMines + ownedFactories + ownedBanks + ownedTemples + ownedWizards;
    }

    // Compute cookies per second based on owned buildings and their cps values
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

    function updateDisplay() {
        // Use the 🍪 emoji for counters as requested, keep the image for buttons
        cookieCountElement.innerHTML = `${cookieEmoji} ${formatNumber(cookieCount)}`;
        // changed to innerHTML so suffix span coloring appears inside cps text
        perSecondElement.innerHTML = `cps: ${formatPerSecond(cookiesPerSecond)}`;

        // Update the left labels (JS still writes the same content)
        document.getElementById('autotap-label').innerHTML = `<strong>Autotap: ${ownedAutotaps}</strong><span class="subtitle">+${autotapCps}/s</span>`;
        document.getElementById('pickaxe-label').innerHTML = `<strong>Pickaxe: ${ownedPickaxes}</strong><span class="subtitle">+${pickaxeCps}/s</span>`;
        document.getElementById('farm-label').innerHTML = `<strong>Shovel: ${ownedFarms}</strong><span class="subtitle">+${farmCps}/s</span>`;
        document.getElementById('mine-label').innerHTML = `<strong>Crystal: ${ownedMines}</strong><span class="subtitle">+${mineCps}/s</span>`;
        document.getElementById('factory-label').innerHTML = `<strong>Factory: ${ownedFactories}</strong><span class="subtitle">+${factoryCps}/s</span>`;
        document.getElementById('bank-label').innerHTML = `<strong>Shield: ${ownedBanks}</strong><span class="subtitle">+${bankCps}/s</span>`;
        document.getElementById('temple-label').innerHTML = `<strong>Woodboat: ${ownedTemples}</strong><span class="subtitle">+${templeCps}/s</span>`;
        document.getElementById('wizard-label').innerHTML = `<strong>Gametower: ${ownedWizards}</strong><span class="subtitle">+${wizardCps}/s</span>`;

        // Buttons content keeps the cookie image for visual clarity
        upgradeButtonElement.innerHTML = `🍪<span class="cost">${formatNumber(Math.floor(upgradeCost))}</span>`;
        pickaxeButtonElement.innerHTML  = `🍪<span class="cost">${formatNumber(Math.floor(pickaxeCost))}</span>`;
        farmButtonElement.innerHTML     = `🍪<span class="cost">${formatNumber(Math.floor(farmCost))}</span>`;
        mineButtonElement.innerHTML     = `🍪<span class="cost">${formatNumber(Math.floor(mineCost))}</span>`;
        factoryButtonElement.innerHTML  = `🍪<span class="cost">${formatNumber(Math.floor(factoryCost))}</span>`;
        bankButtonElement.innerHTML     = `🍪<span class="cost">${formatNumber(Math.floor(bankCost))}</span>`;
        templeButtonElement.innerHTML   = `🍪<span class="cost">${formatNumber(Math.floor(templeCost))}</span>`;
        wizardButtonElement.innerHTML   = `🍪<span class="cost">${formatNumber(Math.floor(wizardCost))}</span>`;

        totalCookiesRow.innerHTML = `${cookieEmoji} ${formatNumber(Math.floor(totalCookies))}`;

        // New: update clicks row and total buildings row
        if (clicksRow) {
            clicksRow.innerHTML = `👆 ${formatNumber(Math.floor(clickCount))}`;
        }
        if (totalBuildingsRow) {
            totalBuildingsRow.innerHTML = ` 🏗️ ${formatNumber(Math.floor(computeTotalBuildings()))}`;
        }

        // Update upgrades panel whenever display updates
        updateUpgradesPanel();
    }

    function createClickerClone(clicks, x, y) {
        const clone = document.createElement('div');
        clone.className = 'clicker-clone';
        // Use innerHTML so the suffix span (if any) renders instead of appearing as raw tags
        clone.innerHTML = `+${formatPerClick(cookiesPerClick)}`;
        clone.style.top = `${y}px`;
        clone.style.left = `${x}px`;
        document.body.appendChild(clone);
        requestAnimationFrame(() => {
            clone.style.transform = 'translateY(-20px)';
            clone.style.opacity = '0';
        });
        setTimeout(() => {
            if (clone.parentNode) clone.parentNode.removeChild(clone);
        }, 300);
    }
    function createGoldenCookie(x, y) {
        const goldenCookie = document.createElement('img');
        goldenCookie.src = 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/af8bc113-d9a4-40cf-9077-06b673c583e0/dl5xrcg-ca710567-8e32-4fe1-a5dc-0015ee3a93b5.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi9hZjhiYzExMy1kOWE0LTQwY2YtOTA3Ny0wNmI2NzNjNTgzZTAvZGw1eHJjZy1jYTcxMDU2Ny04ZTMyLTRmZTEtYTVkYy0wMDE1ZWUzYTkzYjUucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.Dde560uBMuh2GnSrfHYQooTQZow86gfyT9vUBvd78KE';
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
            if (document.body.contains(goldenCookie)) {
                document.body.removeChild(goldenCookie);
            }
        }, 5000);
    }

    function startInterval() {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
            // update cookies based on computed cookiesPerSecond
            computeCookiesPerSecond();
            cookieCount += cookiesPerSecond / 10;
            totalCookies += cookiesPerSecond / 10;

            updateDisplay();
            checkUpgrades();
        }, 1000 / 10);
    }

    function checkUpgrades() {
        if (cookieCount >= 100) {
            document.getElementById('pickaxe-upgrade').style.display = 'flex';
        }
        if (cookieCount >= 1100) {
            document.getElementById('farm-upgrade').style.display = 'flex';
        }
        if (cookieCount >= 16000) {
            document.getElementById('mine-upgrade').style.display = 'flex';
        }
        if (cookieCount >= 130000) {
            document.getElementById('factory-upgrade').style.display = 'flex';
        }
        if (cookieCount >= 870000) {
            document.getElementById('bank-upgrade').style.display = 'flex';
        }
        if (cookieCount >= 20000000) {
            document.getElementById('temple-upgrade').style.display = 'flex';
        }
        if (cookieCount >= 330000000) {
            document.getElementById('wizard-upgrade').style.display = 'flex';
        }
    }

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
            maxUpgradeReached,
            totalCookies,
            // persist clicks too
            clickCount,
            // persist upgrades
            basicTapsPurchased,
            autotapCps,
            cursorMultiplier
        };
        try {
            localStorage.setItem(`cookieClicks_${username}`, JSON.stringify(progress));
        } catch (e) { /* ignore storage errors */ }
    }
    function loadProgress(username) {
        try {
            const savedProgress = localStorage.getItem(`cookieClicks_${username}`);
            if (savedProgress) {
                const progress = JSON.parse(savedProgress);
                cookieCount = progress.cookieCount || 0;
                cookiesPerClick = progress.cookiesPerClick || 1;
                cookiesPerSecond = progress.cookiesPerSecond || 0;
                upgradeCost = progress.upgradeCost || 15;
                pickaxeCost = progress.pickaxeCost || 100;
                farmCost = progress.farmCost || 1100;
                mineCost = progress.mineCost || 16000;
                factoryCost = progress.factoryCost || 130000;
                bankCost = progress.bankCost || 870000;
                templeCost = progress.templeCost || 20000000;
                wizardCost = progress.wizardCost || 330000000;
                ownedAutotaps = progress.ownedAutotaps || 0;
                ownedPickaxes = progress.ownedPickaxes || 0;
                ownedFarms = progress.ownedFarms || 0;
                ownedMines = progress.ownedMines || 0;
                ownedFactories = progress.ownedFactories || 0;
                ownedBanks = progress.ownedBanks || 0;
                ownedTemples = progress.ownedTemples || 0;
                ownedWizards = progress.ownedWizards || 0;
                maxUpgradeReached = progress.maxUpgradeReached || false;
                totalCookies = progress.totalCookies || cookieCount;
                // load clicks if present
                clickCount = progress.clickCount || 0;
                basicTapsPurchased = progress.basicTapsPurchased || false;
                autotapCps = (typeof progress.autotapCps !== 'undefined') ? progress.autotapCps : autotapCps;
                cursorMultiplier = (typeof progress.cursorMultiplier !== 'undefined') ? progress.cursorMultiplier : cursorMultiplier;
            }
        } catch (e) {
            // ignore parse errors
        }
        computeCookiesPerSecond();
        updateDisplay();
        startInterval();
    }

    // --- SFX playback helper ---
    function playSfx(baseAudioElement) {
        if (!baseAudioElement) return;
        try {
            const sfx = baseAudioElement.cloneNode(true);
            sfx.volume = baseAudioElement.volume;
            if (sfx.readyState >= 2) sfx.currentTime = 0;
            sfx.play().catch(() => {});
            sfx.addEventListener('ended', () => {
                if (sfx.parentNode) sfx.parentNode.removeChild(sfx);
            });
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

    // --- Event handlers ---
    cookieElement.addEventListener('click', (event) => {
        const now = Date.now();
        if (now - lastClickTime >= 10) {
            lastClickTime = now;
            cookieCount += cookiesPerClick;
            totalCookies += cookiesPerClick;
            // increment clicks count per user request
            clickCount += 1;
            createClickerClone(cookiesPerClick, event.clientX, event.clientY);
            updateDisplay();
            playSfx(clickSoundElement);
        }
    });

    upgradeButtonElement.addEventListener('click', () => {
        if (cookieCount >= upgradeCost) {
            cookieCount -= upgradeCost;
            ownedAutotaps++;
            upgradeCost = Math.round(upgradeCost * 1.12);
            // recompute cps after buying
            computeCookiesPerSecond();
            updateDisplay();
            startInterval();
            playSfx(upgradeSoundElement);
        }
    });

    pickaxeButtonElement.addEventListener('click', () => {
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

    farmButtonElement.addEventListener('click', () => {
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

    mineButtonElement.addEventListener('click', () => {
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

    factoryButtonElement.addEventListener('click', () => {
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

    bankButtonElement.addEventListener('click', () => {
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

    templeButtonElement.addEventListener('click', () => {
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

    wizardButtonElement.addEventListener('click', () => {
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

    // Purchase handler for Basic Taps upgrade
    function buyBasicTaps() {
        if (basicTapsPurchased) return;
        if (cookieCount >= basicTapsCost) {
            cookieCount -= basicTapsCost;
            // set cpc to 2 (explicit per user request) -> make it scale so that future changes still work
            cookiesPerClick *= 2;
            // double autotap CPS so "+0.2/s" becomes "+0.4/s"
            autotapCps *= 2;
            // set cursor multiplier
            cursorMultiplier = 2;
            basicTapsPurchased = true;
            computeCookiesPerSecond();
            updateDisplay();
            playSfx(upgradeSoundElement);
            console.log(`Cursor multiplier upgraded to ${cursorMultiplier}!`);
        }
    }

    function initializeGame(username) {
        userInfoElement.style.display = 'flex';
        usernameDisplayElement.textContent = username;
        loadProgress(username);
        playMusic();
    }

    // Dark mode logic: persist in localStorage and apply on load
    function setDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        // keep the checkbox in sync with the application state
        try {
            if (darkCheckbox) darkCheckbox.checked = enabled;
            if (darkCheckbox) darkCheckbox.setAttribute('aria-checked', enabled ? 'true' : 'false');
            localStorage.setItem('cookieClicks_darkMode', enabled ? '1' : '0');
        } catch (e) {
            // ignore storage errors
        }
    }
    (function initDarkModeFromStorage() {
        try {
            const val = localStorage.getItem('cookieClicks_darkMode');
            const enabled = val === '1';
            if (darkCheckbox) darkCheckbox.checked = enabled;
            setDarkMode(enabled);
        } catch (e) {
            // ignore
        }
    })();

    // Keep the checkbox change listener to react to native clicks and programmatic changes.
    if (darkCheckbox) {
        darkCheckbox.addEventListener('change', (e) => {
            setDarkMode(e.target.checked);
        });
    }

    // --- Segmented control (tabs) logic ---
    function clearSelectedTabs() {
        [buildingsButton, upgradesButton, statsButton, changelogButton, settingsButton].forEach(btn => {
            if (btn) {
                btn.classList.remove('selected');
                btn.setAttribute('aria-pressed', 'false');
            }
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
            case 'buildings':
                if (upgradeContainer) upgradeContainer.style.display = 'flex';
                if (buildingsButton) {
                    buildingsButton.classList.add('selected');
                    buildingsButton.setAttribute('aria-pressed', 'true');
                }
                break;
            case 'upgrades':
                if (upgradesContainer) upgradesContainer.style.display = 'flex';
                if (upgradesButton) {
                    upgradesButton.classList.add('selected');
                    upgradesButton.setAttribute('aria-pressed', 'true');
                }
                break;
            case 'stats':
                if (statsContainer) statsContainer.style.display = 'flex';
                if (statsButton) {
                    statsButton.classList.add('selected');
                    statsButton.setAttribute('aria-pressed', 'true');
                }
                break;
            case 'changelog':
                if (changelogContainer) changelogContainer.style.display = 'flex';
                if (changelogButton) {
                    changelogButton.classList.add('selected');
                    changelogButton.setAttribute('aria-pressed', 'true');
                }
                break;
            case 'settings':
                if (settingsContainer) settingsContainer.style.display = 'flex';
                if (settingsButton) {
                    settingsButton.classList.add('selected');
                    settingsButton.setAttribute('aria-pressed', 'true');
                }
                break;
        }
    }

    // attach handlers (if elements exist)
    buildingsButton && buildingsButton.addEventListener('click', () => showTab('buildings'));
    upgradesButton && upgradesButton.addEventListener('click', () => showTab('upgrades'));
    statsButton && statsButton.addEventListener('click', () => showTab('stats'));
    changelogButton && changelogButton.addEventListener('click', () => showTab('changelog'));
    settingsButton && settingsButton.addEventListener('click', () => showTab('settings'));

    // Provide keyboard accessibility for segmented control (left/right to navigate)
    const segButtons = [buildingsButton, upgradesButton, statsButton, changelogButton, settingsButton].filter(Boolean);
    segButtons.forEach((btn, idx) => {
        btn.tabIndex = 0;
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                const next = segButtons[(idx + 1) % segButtons.length];
                next && next.focus();
                next && next.click();
            } else if (e.key === 'ArrowLeft') {
                const prev = segButtons[(idx - 1 + segButtons.length) % segButtons.length];
                prev && prev.focus();
                prev && prev.click();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });

    // Ensure initial visible tab is buildings
    showTab('buildings');

    setTimeout(() => {
        loadingScreen.style.display = 'none';
        usernameContainer.style.display = 'block';
        pauseMusic();
    }, 2000);

    const usernameInput = document.querySelector('.username-container input');
    usernameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            let username = usernameInput.value.trim();
            if (!username || username.match(/^\s*$/)) {
                username = `User${Math.floor(Math.random() * 1000000000)}`;
            }
            username = username.replace(/[^a-zA-Z0-9_.]/g, '');
            if (username) {
                // Request notification permission and show the welcome notification as part of the same user gesture.
                requestPermissionAndNotify(`Welcome!`, "You've earned 309.7k cookies while away");

                usernameContainer.style.display = 'none';
                container.style.display = 'block';
                initializeGame(username);
            }
        }
    });
    continueButton.addEventListener('click', () => {
        let username = usernameInput.value.trim();
        if (!username || username.match(/^\s*$/)) {
            username = `player${Math.floor(Math.random() * 1000000000)}`;
        }
        username = username.replace(/[^a-zA-Z0-9_.]/g, '');
        if (username) {
            // Request notification permission and show the welcome notification as part of the same user gesture.
            requestPermissionAndNotify(`Welcome`, "You've earned 309.7k cookies while away");

            usernameContainer.style.display = 'none';
            container.style.display = 'block';
            initializeGame(username);
        }
    });
    setInterval(() => {
        const username = usernameInput.value.trim();
        if (username) {
            saveProgress(username);
        }
    }, 5000);

    startInterval();
    setInterval(() => {
        // Use plain text formatter in the tab title (no HTML)
        document.title = `${formatNumber(cookieCount)} cookies`;
    }, 1000);

    // Set initial volumes on load
    // make sure slider visuals reflect the value
    if (musicVolumeSlider) {
        setMusicVolume(musicVolumeSlider.value);
        updateSliderBackground(musicVolumeSlider);
    }
    if (sfxVolumeSlider) {
        setSfxVolume(sfxVolumeSlider.value);
        updateSliderBackground(sfxVolumeSlider);
    }

    // Initial render
    computeCookiesPerSecond();
    updateDisplay();

    // --- UPGRADES panel logic ---
    function updateUpgradesPanel() {
        // Build a list of available upgrades to show
        const available = [];

        // Basic Taps becomes available once player owns at least 1 Autotap and has not purchased it yet
        if (ownedAutotaps >= 1 && !basicTapsPurchased) {
            available.push({
                id: 'basic-taps',
                title: 'Basic Taps',
                description: 'Clicks and Autotaps are worth 2x more',
                cost: basicTapsCost,
                imgSrc: document.getElementById('autotap-image').src
            });
        }

        // Render
        upgradesListElement.innerHTML = '';
        if (available.length === 0) {
            // If there are no available upgrades, show the "Nothing in here" message
            const nothing = document.createElement('div');
            nothing.className = 'nothing';
            nothing.textContent = 'Nothing in here';
            upgradesListElement.appendChild(nothing);
            return;
        }

        available.forEach(upg => {
            const item = document.createElement('div');
            item.className = 'upgrade-item';
            const img = document.createElement('img');
            img.src = upg.imgSrc;
            img.alt = upg.title;
            const label = document.createElement('div');
            label.className = 'label';
            const strong = document.createElement('strong');
            strong.innerText = upg.title + ``;
            const subtitle = document.createElement('div');
            subtitle.className = 'subtitle';
            subtitle.innerText = upg.description;

            label.appendChild(strong);
            label.appendChild(subtitle);

            const btn = document.createElement('button');
            btn.innerHTML = `🍪 <span class="cost">${formatNumber(Math.floor(upg.cost))}</span>`;
            btn.addEventListener('click', () => {
                if (upg.id === 'basic-taps') {
                    buyBasicTaps();
                }
            });

            item.appendChild(img);
            item.appendChild(label);
            item.appendChild(btn);

            upgradesListElement.appendChild(item);
        });
    }

});
