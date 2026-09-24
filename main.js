/* ==========================================================
   JonasFitness – main.js
   1. Loading screen (5 sekunder)
   2. Menu
   3. Beregner (vægttab / muskelopbygning)
   4. Kundevideoer
   5. Årstal i footer
   ========================================================== */
(function () {
    'use strict';

    /* ---------- 1. LOADING SCREEN ---------- */
    var LOADER_MS = 3500;        // hvor længe loading screen vises i alt
    var SECOND_GIF_MS = 1000;    // gif 2 vises de sidste 2 sek. (gif 1 vises de første 3 sek.)
    var FADE_MS = 1000;           // skal matche transition i styles.css

    // Baggrund til hver gif: [0] = gif 1, [1] = gif 2
    //   'auto'    = siden aflæser selv gif'ens baggrundsfarve og bruger den som baggrund
    //               på loading screen, så gif'en smelter ind uden en synlig kasse.
    //   '#FFFFFF' = skriv selv farven (fx hvid), hvis 'auto' ikke virker.
    var GIF_BACKGROUNDS = ['auto', 'auto'];

    var loader = document.getElementById('loader');
    var loaderGif = document.getElementById('loaderGif');
    var loaderGif2 = document.getElementById('loaderGif2');

    function finishLoading() {
        document.body.classList.remove('is-loading');
        if (!loader) return;
        loader.classList.add('is-hidden');
        window.setTimeout(function () {
            if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        }, FADE_MS);
    }

    function hexToRgb(hex) {
        var h = String(hex).replace('#', '').trim();
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (!/^[0-9a-f]{6}$/i.test(h)) return null;
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16)
        };
    }

    function applyLoaderColor(rgb) {
        if (!rgb || !loader) return;
        loader.style.setProperty('--loader-bg', 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')');
        var luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
        loader.classList.toggle('loader--light', luminance > 150);
    }

    function gifSrc(img) {
        return img.getAttribute('data-src') || img.currentSrc || img.src;
    }

    // Læser farven i gif'ens fire hjørner. Er de ens, er det baggrunden.
    function sampleGifBackground(src, done) {
        var probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.referrerPolicy = 'no-referrer';
        probe.onload = function () {
            try {
                var w = probe.naturalWidth;
                var h = probe.naturalHeight;
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(probe, 0, 0);

                var points = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
                var px = points.map(function (pt) {
                    return ctx.getImageData(pt[0], pt[1], 1, 1).data;
                });

                // Gennemsigtig gif: ingen baggrund at fjerne
                var transparent = px.every(function (d) { return d[3] < 10; });
                if (transparent) { done(null); return; }

                var first = px[0];
                var uniform = px.every(function (d) {
                    return d[3] > 200 &&
                        Math.abs(d[0] - first[0]) < 14 &&
                        Math.abs(d[1] - first[1]) < 14 &&
                        Math.abs(d[2] - first[2]) < 14;
                });
                done(uniform ? { r: first[0], g: first[1], b: first[2] } : null);
            } catch (err) {
                done(null);   // fx hvis serveren ikke tillader aflæsning
            }
        };
        probe.onerror = function () { done(null); };
        probe.src = src;
    }

    function resolveBackground(setting, img, done) {
        if (setting === 'auto') sampleGifBackground(gifSrc(img), done);
        else done(hexToRgb(setting));
    }

    if (loader) {
        document.body.classList.add('is-loading');   // lås scroll, mens loading screen vises
        loader.style.setProperty('--loader-ms', LOADER_MS + 'ms');

        // Kør progress-baren, så snart siden har tegnet første billede
        window.requestAnimationFrame(function () {
            loader.classList.add('is-running');
        });

        // Vis gif 1, når baggrundsfarven er fundet (eller efter 1,5 sek. som sikkerhed)
        var readyShown = false;
        var secondShown = false;
        function showGif() {
            if (readyShown) return;
            readyShown = true;
            loader.classList.add('is-ready');
        }
        window.setTimeout(showGif, 1500);

        /* Gif 1 */
        if (loaderGif) {
            // Hvis gif'en ikke kan hentes, skjuler vi den i stedet for at vise et brudt billede
            loaderGif.addEventListener('error', function () { loaderGif.hidden = true; });

            // Lås scenens højde til gif 1, så layoutet ikke hopper, når gif 2 tager over
            var lockStageHeight = function () {
                var height = loaderGif.getBoundingClientRect().height;
                if (height > 0) loader.style.setProperty('--stage-h', Math.round(height) + 'px');
            };
            if (loaderGif.complete && loaderGif.naturalWidth) lockStageHeight();
            else loaderGif.addEventListener('load', lockStageHeight);

            resolveBackground(GIF_BACKGROUNDS[0], loaderGif, function (rgb) {
                if (!secondShown) applyLoaderColor(rgb);
                showGif();
            });
        } else {
            showGif();
        }

        /* Gif 2: tager over, når der er SECOND_GIF_MS tilbage */
        if (loaderGif2) {
            var gif2Color = null;
            var gif2Src = gifSrc(loaderGif2);

            // Hent gif 2 i baggrunden, så den er klar, når den skal vises
            var preload = new Image();
            preload.referrerPolicy = 'no-referrer';
            preload.src = gif2Src;

            resolveBackground(GIF_BACKGROUNDS[1], loaderGif2, function (rgb) {
                gif2Color = rgb;
                if (secondShown) applyLoaderColor(rgb);
            });

            window.setTimeout(function () {
                // Sætter vi src først nu, starter gif 2 forfra på det rigtige tidspunkt
                loaderGif2.addEventListener('load', function () {
                    secondShown = true;
                    if (loaderGif) loaderGif.hidden = true;
                    loaderGif2.hidden = false;
                    applyLoaderColor(gif2Color);
                }, { once: true });
                // Kan gif 2 ikke hentes, bliver gif 1 bare stående
                loaderGif2.src = gif2Src;
            }, Math.max(0, LOADER_MS - SECOND_GIF_MS));
        }

        window.setTimeout(finishLoading, LOADER_MS);
    }

    /* ---------- 2. MENU ---------- */
    var menuBtn = document.getElementById('menuBtn');
    var siteNav = document.getElementById('siteNav');

    function setMenu(open) {
        if (!menuBtn || !siteNav) return;
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Luk menu' : 'Åbn menu');
        siteNav.classList.toggle('is-open', open);
    }

    if (menuBtn && siteNav) {
        menuBtn.addEventListener('click', function () {
            setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
        });
        siteNav.addEventListener('click', function (e) {
            if (e.target.closest('a')) setMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                setMenu(false);
                menuBtn.focus();
            }
        });
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.site-header')) setMenu(false);
        });
    }

    /* ---------- 3. BEREGNER ---------- */
    var calc = document.getElementById('calc');

    if (calc) {
        var steps = {
            goal: calc.querySelector('[data-step="goal"]'),
            form: calc.querySelector('[data-step="form"]'),
            result: calc.querySelector('[data-step="result"]')
        };
        var form = steps.form;
        var formTitle = document.getElementById('formTitle');
        var resultTitle = document.getElementById('resultTitle');
        var amountLabel = document.getElementById('amountLabel');
        var paceSelect = document.getElementById('paceSelect');
        var formError = document.getElementById('formError');

        var GOALS = {
            loss: {
                title: 'Vægttab',
                amountLabel: 'Hvor mange kg vil du tabe?',
                paces: [
                    { value: 0.25, label: 'Rolig – ca. 0,25 kg om ugen' },
                    { value: 0.5,  label: 'Moderat – ca. 0,5 kg om ugen' },
                    { value: 0.75, label: 'Hurtig – ca. 0,75 kg om ugen' }
                ],
                defaultPace: 0.5
            },
            muscle: {
                title: 'Muskelopbygning',
                amountLabel: 'Hvor mange kg vil du tage på?',
                paces: [
                    { value: 250, label: 'Rolig – 250 kcal over dit behov' },
                    { value: 350, label: 'Moderat – 350 kcal over dit behov' },
                    { value: 500, label: 'Hurtig – 500 kcal over dit behov' }
                ],
                defaultPace: 350
            }
        };

        var KCAL_PER_KG = 7700;   // tommelfingerregel for energi i 1 kg kropsvægt
        var currentGoal = null;

        function showStep(name) {
            Object.keys(steps).forEach(function (key) {
                steps[key].hidden = key !== name;
            });
        }

        function setGoal(goalKey) {
            currentGoal = goalKey;
            var goal = GOALS[goalKey];
            formTitle.textContent = goal.title;
            amountLabel.textContent = goal.amountLabel;

            paceSelect.innerHTML = '';
            goal.paces.forEach(function (pace) {
                var option = document.createElement('option');
                option.value = String(pace.value);
                option.textContent = pace.label;
                if (pace.value === goal.defaultPace) option.selected = true;
                paceSelect.appendChild(option);
            });
        }

        function showError(message, field) {
            formError.textContent = message;
            formError.hidden = false;
            Array.prototype.forEach.call(form.querySelectorAll('input'), function (input) {
                input.removeAttribute('aria-invalid');
            });
            if (field) {
                field.setAttribute('aria-invalid', 'true');
                field.focus();
            }
        }

        function clearError() {
            formError.hidden = true;
            formError.textContent = '';
            Array.prototype.forEach.call(form.querySelectorAll('input'), function (input) {
                input.removeAttribute('aria-invalid');
            });
        }

        function round(n, step) {
            step = step || 1;
            return Math.round(n / step) * step;
        }

        function fmt(n, decimals) {
            return n.toLocaleString('da-DK', {
                minimumFractionDigits: decimals || 0,
                maximumFractionDigits: decimals || 0
            });
        }

        function formatDuration(weeks) {
            if (weeks < 9) return 'ca. ' + fmt(Math.max(1, Math.round(weeks))) + ' uger';
            var months = weeks / 4.345;
            return 'ca. ' + fmt(Math.round(months)) + ' måneder';
        }

        // Mifflin-St Jeor
        function calcBmr(sex, weight, height, age) {
            return 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
        }

        function calculate(values) {
            var bmr = calcBmr(values.sex, values.weight, values.height, values.age);
            var tdee = bmr * values.activity;
            var kcal, weeks, note, adjusted = false;

            if (currentGoal === 'loss') {
                var deficit = (values.pace * KCAL_PER_KG) / 7;
                kcal = tdee - deficit;

                // Sikkerhedsgulv: vi anbefaler ikke under dette niveau
                var floor = values.sex === 'male' ? 1500 : 1200;
                if (kcal < floor) {
                    kcal = floor;
                    adjusted = true;
                }
                var actualDeficit = tdee - kcal;
                if (actualDeficit < 50) {
                    return { error: 'Ud fra dine tal kan vi ikke sætte et sikkert kalorieunderskud. Tal med en coach om en plan, der passer til dig.' };
                }
                weeks = (values.amount * KCAL_PER_KG) / (actualDeficit * 7);
                note = adjusted
                    ? 'Vi har hævet kalorierne, så du ikke kommer under et sikkert minimum. Derfor tager det lidt længere tid end det tempo, du valgte.'
                    : 'Spis omkring dette tal hver dag, og kombinér med styrketræning for at bevare musklerne, mens du taber dig.';
            } else {
                var surplus = values.pace;
                kcal = tdee + surplus;
                var weeklyGain = (surplus * 7) / KCAL_PER_KG;
                weeks = values.amount / weeklyGain;
                note = 'Ikke al vægtøgning bliver til muskler. Med regelmæssig styrketræning og nok søvn bliver en stor del det, især i starten.';
            }

            // Fordeling af makronæringsstoffer
            var proteinPerKg = currentGoal === 'loss' ? 2.0 : 1.8;
            var protein = Math.min(proteinPerKg * values.weight, (0.35 * kcal) / 4);
            var fat = (0.25 * kcal) / 9;
            var carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);

            return {
                kcal: round(kcal, 10),
                protein: round(protein, 5),
                fat: round(fat, 5),
                carbs: round(carbs, 5),
                weeks: weeks,
                note: note
            };
        }

        function readValues() {
            var data = new FormData(form);
            return {
                sex: data.get('sex'),
                age: parseFloat(data.get('age')),
                height: parseFloat(data.get('height')),
                weight: parseFloat(String(data.get('weight')).replace(',', '.')),
                amount: parseFloat(String(data.get('amount')).replace(',', '.')),
                activity: parseFloat(data.get('activity')),
                pace: parseFloat(data.get('pace'))
            };
        }

        function validate(values) {
            var f = form.elements;
            if (!(values.age >= 18 && values.age <= 80)) {
                return { message: 'Angiv en alder mellem 18 og 80 år. Er du under 18, så tal med din læge eller forælder om en plan.', field: f.age };
            }
            if (!(values.height >= 130 && values.height <= 230)) {
                return { message: 'Angiv din højde i cm, mellem 130 og 230.', field: f.height };
            }
            if (!(values.weight >= 40 && values.weight <= 250)) {
                return { message: 'Angiv din vægt i kg, mellem 40 og 250.', field: f.weight };
            }
            if (!(values.amount >= 1 && values.amount <= 60)) {
                return { message: 'Angiv et mål mellem 1 og 60 kg.', field: f.amount };
            }
            if (currentGoal === 'loss') {
                var heightM = values.height / 100;
                var goalBmi = (values.weight - values.amount) / (heightM * heightM);
                if (goalBmi < 18.5) {
                    return { message: 'Det mål ville give en BMI under 18,5, og det anbefaler vi ikke. Vælg et lavere antal kg.', field: f.amount };
                }
            }
            return null;
        }

        function renderResult(result) {
            var isLoss = currentGoal === 'loss';
            resultTitle.textContent = 'Din plan til ' + (isLoss ? 'vægttab' : 'muskelopbygning');
            document.getElementById('resKcal').textContent = fmt(result.kcal) + ' kcal';
            document.getElementById('resProtein').textContent = fmt(result.protein) + ' g';
            document.getElementById('resFat').textContent = fmt(result.fat) + ' g';
            document.getElementById('resCarbs').textContent = fmt(result.carbs) + ' g';
            document.getElementById('resTimeLabel').textContent = isLoss
                ? 'Estimeret tid til dit vægttab'
                : 'Estimeret tid til din vægtøgning';
            document.getElementById('resTime').textContent = formatDuration(result.weeks);
            document.getElementById('resNote').textContent = result.note;
        }

        // Vælg mål
        calc.addEventListener('click', function (e) {
            var goalBtn = e.target.closest('[data-goal]');
            if (goalBtn) {
                setGoal(goalBtn.getAttribute('data-goal'));
                clearError();
                showStep('form');
                formTitle.focus();
                return;
            }
            if (e.target.closest('[data-back]')) {
                showStep('goal');
                return;
            }
            if (e.target.closest('[data-recalc]')) {
                showStep('form');
                formTitle.focus();
            }
        });

        // Beregn
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            clearError();

            var values = readValues();
            var problem = validate(values);
            if (problem) {
                showError(problem.message, problem.field);
                return;
            }

            var result = calculate(values);
            if (result.error) {
                showError(result.error);
                return;
            }

            renderResult(result);
            showStep('result');
            resultTitle.focus();
        });
    }

    /* ---------- 4. KUNDEVIDEOER ---------- */
    var videoCards = document.querySelectorAll('.video-card');

    Array.prototype.forEach.call(videoCards, function (card) {
        var poster = card.getAttribute('data-poster');
        if (poster) card.style.setProperty('--poster', 'url("' + poster + '")');

        card.addEventListener('click', function () {
            var src = card.getAttribute('data-video');
            var soon = card.querySelector('.video-card__soon');

            // Ingen video tilføjet endnu: vis en lille besked
            if (!src) {
                if (soon) soon.hidden = false;
                return;
            }

            var labelEl = card.querySelector('.video-card__label');
            var video = document.createElement('video');
            video.src = src;
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            video.setAttribute('aria-label', labelEl ? labelEl.textContent.trim() : 'Kundehistorie');

            // En video må ikke ligge inde i en knap, så vi bytter knappen ud med en almindelig boks
            var wrapper = document.createElement('div');
            wrapper.className = 'video-card';
            wrapper.appendChild(video);
            card.replaceWith(wrapper);
            video.play().catch(function () { /* brugeren kan starte via kontrolelementerne */ });
        });
    });

    /* ---------- 5. ÅRSTAL ---------- */
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();

/* LOGO SCROLL UP */
document.querySelector('.brand').addEventListener('click', function (e) {
    e.preventDefault();

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

/* ==========================================================
   TILFØJELSE til main.js – kun disse linjer tilføjes, intet slettes.
   Find beregner-formularens submit-handler ("// Beregn") og sæt blokken
   lige EFTER linjen:   renderResult(result);
   ========================================================== */

document.dispatchEvent(new CustomEvent('jonasfitness:plan', {
    detail: {
        goal: currentGoal,                 // 'loss' eller 'muscle'
        sex: values.sex,
        age: values.age,
        height: values.height,
        weight: values.weight,
        amount: values.amount,             // kg der skal tabes/tages på
        weeks: Math.round(result.weeks)    // estimeret tid
    }
}));

/* Det ser så sådan her ud i sammenhængen:

            renderResult(result);
            document.dispatchEvent(new CustomEvent('jonasfitness:plan', { ... }));
            showStep('result');
            resultTitle.focus();
*/