/* ==========================================================
   JonasFitness – forvandling.js (ny fil, ligger ved siden af main.js)
   Upload af billede + AI-billede ud fra planen fra beregneren.
   ========================================================== */
(function () {
    'use strict';

    // Skift til adressen på din Worker (se 5-worker.js). ALDRIG en API-nøgle her.
    var AI_ENDPOINT = 'solitary-pond-d53b.joni0014.workers.dev';
    var MAX_SIDE = 1024;          // billedet skaleres ned før upload
    var TIMEOUT_MS = 120000;

    var section = document.getElementById('forvandling');
    if (!section) return;

    var fileInput = document.getElementById('photoInput');
    var photoPrompt = document.getElementById('photoPrompt');
    var photoPreview = document.getElementById('photoPreview');
    var aiSlot = document.getElementById('aiSlot');
    var aiPrompt = document.getElementById('aiPrompt');
    var aiImage = document.getElementById('aiImage');
    var aiCaption = document.getElementById('aiCaption');
    var consent = document.getElementById('aiConsent');
    var btn = document.getElementById('aiBtn');
    var statusEl = document.getElementById('aiStatus');

    var plan = null;        // kommer fra beregneren
    var photoBlob = null;
    var busy = false;

    function setStatus(text, isError) {
        statusEl.textContent = text || '';
        statusEl.classList.toggle('is-error', !!isError);
    }

    function refresh() {
        var hint = '';
        if (!plan) hint = 'Det er dsv. ikke muligt, at anvende denne feature da det kræver en API key. Det bliver forhåbentligt muligt i nær fremtid :-).';
        else if (!photoBlob) hint = 'Upload et billede af dig selv.';
        else if (!consent.checked) hint = 'Sæt flueben for at fortsætte.';

        btn.disabled = busy || !!hint;
        if (!busy && !statusEl.classList.contains('is-error')) setStatus(hint);
    }

    function formatDuration(weeks) {
        if (weeks < 9) return 'ca. ' + Math.max(1, weeks) + ' uger';
        return 'ca. ' + Math.round(weeks / 4.345) + ' måneder';
    }

    /* ---- Planen fra beregneren (main.js sender eventet) ---- */
    document.addEventListener('jonasfitness:plan', function (e) {
        plan = e.detail;
        aiCaption.textContent = 'Efter ' + formatDuration(plan.weeks);
        aiImage.hidden = true;            // gammelt resultat passer ikke længere
        aiPrompt.hidden = false;
        statusEl.classList.remove('is-error');
        refresh();
    });

    /* ---- Upload og nedskalering ---- */
    function resizeImage(file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () {
                var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                canvas.toBlob(function (blob) {
                    blob ? resolve(blob) : reject(new Error('resize'));
                }, 'image/jpeg', 0.9);
            };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('load')); };
            img.src = url;
        });
    }

    fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        statusEl.classList.remove('is-error');

        resizeImage(file).then(function (blob) {
            photoBlob = blob;
            if (photoPreview.src) URL.revokeObjectURL(photoPreview.src);
            photoPreview.src = URL.createObjectURL(blob);
            photoPreview.hidden = false;
            photoPrompt.hidden = true;
            refresh();
        }, function () {
            photoBlob = null;
            setStatus('Billedet kunne ikke læses. Prøv et andet billede (JPG, PNG eller WebP).', true);
            refresh();
        });
    });

    consent.addEventListener('change', refresh);

    /* ---- Generér ---- */
    btn.addEventListener('click', function () {
        if (busy || !plan || !photoBlob || !consent.checked) return;

        busy = true;
        statusEl.classList.remove('is-error');
        aiSlot.classList.add('ph--busy');
        aiImage.hidden = true;
        aiPrompt.hidden = false;
        aiPrompt.textContent = 'Genererer…';
        btn.disabled = true;
        setStatus('Det kan tage op til et minut. Bliv på siden.');

        var body = new FormData();
        body.append('image', photoBlob, 'foto.jpg');
        body.append('plan', JSON.stringify(plan));

        var controller = new AbortController();
        var timer = window.setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

        fetch(AI_ENDPOINT, { method: 'POST', body: body, signal: controller.signal })
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    if (!res.ok || !data.image) throw new Error(data.error || 'server');
                    return data.image;
                });
            })
            .then(function (dataUrl) {
                aiImage.src = dataUrl;
                aiImage.hidden = false;
                aiPrompt.hidden = true;
                setStatus('');
            })
            .catch(function () {
                aiPrompt.hidden = false;
                aiPrompt.textContent = 'Dit AI-billede vises her';
                setStatus('Kunne ikke lave billedet lige nu. Prøv igen om lidt.', true);
            })
            .finally(function () {
                window.clearTimeout(timer);
                busy = false;
                aiSlot.classList.remove('ph--busy');
                refresh();
            });
    });

    refresh();
})();