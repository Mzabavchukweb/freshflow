// Fresh Flow: menu, rozwijana lista usług i formularze (szybki „oddzwonimy” i pełna wycena). Bez bibliotek.
(function () {
  'use strict';

  var TEKSTY = {
    pl: {
      menu: 'Menu', zamknij: 'Zamknij', wysylam: 'Wysyłam…',
      tel: 'Wpisz numer telefonu, np. 600 100 200.',
      email: 'Sprawdź adres e-mail albo zostaw to pole puste.',
      ok: 'Dziękujemy. Zapytanie dotarło, oddzwonimy od poniedziałku do piątku, 7:00-17:00.',
      blad: 'Nie udało się wysłać zapytania.',
      siec: 'Brak połączenia z internetem. Spróbuj ponownie albo zadzwoń: 508 288 755.',
      zadzwon: ' Możesz też zadzwonić: 508 288 755.',
      zgoda: 'Zaznacz zgodę, żebyśmy mogli oddzwonić.'
    },
    de: {
      menu: 'Menü', zamknij: 'Schließen', wysylam: 'Wird gesendet…',
      tel: 'Bitte geben Sie Ihre Telefonnummer ein.',
      email: 'Bitte prüfen Sie die E-Mail-Adresse oder lassen Sie das Feld leer.',
      ok: 'Vielen Dank. Ihre Anfrage ist angekommen, wir rufen Sie Montag bis Freitag zwischen 7:00 und 17:00 Uhr zurück.',
      blad: 'Die Anfrage konnte nicht gesendet werden.',
      siec: 'Keine Internetverbindung. Bitte erneut versuchen oder anrufen: +48 508 288 755.',
      zadzwon: ' Sie können uns auch anrufen: +48 508 288 755.',
      zgoda: 'Bitte bestätigen Sie die Einwilligung, damit wir zurückrufen können.'
    }
  };
  var t = TEKSTY[document.documentElement.lang] || TEKSTY.pl;

  var menuPrzycisk = document.querySelector('.menu-przycisk');
  var nawigacja = document.getElementById('nawigacja');
  var rozwin = document.querySelector('.nawigacja__rozwin');
  var megamenu = document.getElementById('megamenu');
  var desktop = window.matchMedia('(min-width: 80em)');

  function ustawMenu(otwarte) {
    menuPrzycisk.setAttribute('aria-expanded', String(otwarte));
    menuPrzycisk.querySelector('.menu-przycisk__tekst').textContent = otwarte ? t.zamknij : t.menu;
    // menu zaczyna się pod nagłówkiem, także gdy nad nim stoi baner języka
    if (otwarte) nawigacja.style.setProperty('--menu-gora', Math.round(document.querySelector('.naglowek').getBoundingClientRect().bottom) + 'px');
    nawigacja.classList.toggle('otwarta', otwarte);
    document.body.style.overflow = otwarte ? 'hidden' : '';
  }

  function ustawUslugi(otwarte) {
    rozwin.setAttribute('aria-expanded', String(otwarte));
    megamenu.classList.toggle('otwarta', otwarte);
  }

  if (menuPrzycisk && nawigacja) {
    menuPrzycisk.addEventListener('click', function () {
      ustawMenu(menuPrzycisk.getAttribute('aria-expanded') !== 'true');
    });
    // link do sekcji na tej samej stronie (np. #wycena) zamyka menu telefonu
    nawigacja.addEventListener('click', function (e) {
      if (e.target.closest('a[href^="#"]')) ustawMenu(false);
    });
    desktop.addEventListener('change', function () {
      ustawMenu(false);
      ustawUslugi(false);
    });
  }

  if (rozwin && megamenu) {
    rozwin.addEventListener('click', function () {
      ustawUslugi(rozwin.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', function (e) {
      if (desktop.matches && !e.target.closest('.nawigacja__uslugi')) ustawUslugi(false);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (rozwin && rozwin.getAttribute('aria-expanded') === 'true') {
      ustawUslugi(false);
      rozwin.focus();
    } else if (menuPrzycisk && menuPrzycisk.getAttribute('aria-expanded') === 'true') {
      ustawMenu(false);
      menuPrzycisk.focus();
    }
  });

  // Formularze: walidacja w przeglądarce, wysyłka do /api/wycena.php, komunikat bez przeładowania.
  function pokazBlad(pole, tekst) {
    var opak = pole.closest('.zgoda, .pole, .szybki');
    var miejsce = opak && opak.querySelector('.pole__blad');
    if (!miejsce) return;
    miejsce.textContent = tekst || '';
    if (tekst) pole.setAttribute('aria-invalid', 'true');
    else pole.removeAttribute('aria-invalid');
  }

  function sprawdz(formularz) {
    var pierwszy = null;
    var tel = formularz.elements.tel;
    var email = formularz.elements.email;
    var zlyTel = tel.value.replace(/[^0-9]/g, '').length < 9;
    pokazBlad(tel, zlyTel ? t.tel : '');
    if (zlyTel) pierwszy = tel;
    var zgodaPole = formularz.elements.zgoda;
    if (zgodaPole) {
      pokazBlad(zgodaPole, zgodaPole.checked ? '' : t.zgoda);
      if (!zgodaPole.checked && !pierwszy) pierwszy = zgodaPole;
    }
    if (email) {
      var zlyEmail = email.value.trim() !== '' && !email.validity.valid;
      pokazBlad(email, zlyEmail ? t.email : '');
      if (zlyEmail && !pierwszy) pierwszy = email;
    }
    if (pierwszy) pierwszy.focus();
    return !pierwszy;
  }

  Array.prototype.forEach.call(document.querySelectorAll('.js-formularz'), function (formularz) {
    var stan = formularz.querySelector('.formularz__stan');
    var wyslij = formularz.querySelector('[type="submit"]');

    formularz.addEventListener('change', function (e) {
      if (e.target.name === 'zgoda' && e.target.checked) pokazBlad(e.target, '');
    });

    formularz.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') pokazBlad(e.target, '');
    });

    formularz.addEventListener('submit', function (e) {
      e.preventDefault();
      stan.textContent = '';
      stan.removeAttribute('data-typ');
      if (!sprawdz(formularz)) return;

      var etykieta = wyslij.textContent;
      wyslij.disabled = true;
      wyslij.textContent = t.wysylam;

      fetch(formularz.action, { method: 'POST', body: new FormData(formularz), headers: { Accept: 'application/json' } })
        .then(function (r) {
          return r.json().catch(function () { return { ok: false }; });
        })
        .then(function (dane) {
          if (dane.ok) {
            formularz.reset();
            stan.setAttribute('data-typ', 'ok');
            stan.textContent = t.ok;
          } else {
            stan.setAttribute('data-typ', 'blad');
            stan.textContent = (dane.blad || t.blad) + t.zadzwon;
          }
        })
        .catch(function () {
          stan.setAttribute('data-typ', 'blad');
          stan.textContent = t.siec;
        })
        .then(function () {
          wyslij.disabled = false;
          wyslij.textContent = etykieta;
          stan.focus();
        });
    });
  });
})();

// Nagłówek: cień po przewinięciu. Język: zapamiętanie wyboru z przełącznika (ciasteczko „jezyk”, czyta je
// strona główna przy wyborze wersji) i propozycja drugiej wersji, gdy język przeglądarki nie pasuje do strony.
(function () {
  'use strict';

  var naglowek = document.querySelector('.naglowek');
  if (naglowek) {
    var cien = function () { naglowek.classList.toggle('naglowek--cien', window.scrollY > 8); };
    cien();
    window.addEventListener('scroll', cien, { passive: true });
  }

  function zapiszJezyk(jezyk) {
    document.cookie = 'jezyk=' + jezyk + '; path=/; max-age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }

  Array.prototype.forEach.call(document.querySelectorAll('.jezyki a[hreflang]'), function (a) {
    a.addEventListener('click', function () { zapiszJezyk(a.getAttribute('hreflang')); });
  });

  var strona = document.documentElement.lang;
  if (!document.querySelector('.jezyki')) return;
  if (/(?:^|; )jezyk=/.test(document.cookie)) return;
  var przegladarka = ((navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
  if (!/^(pl|de)$/.test(przegladarka) || przegladarka === strona) return;
  var para = document.querySelector('link[rel="alternate"][hreflang="' + przegladarka + '"]');
  var cel = para ? new URL(para.href).pathname : (przegladarka === 'de' ? '/de/' : '/');

  var TEKSTY = {
    de: { tekst: 'Diese Seite gibt es auch auf Deutsch.', przejdz: 'Auf Deutsch lesen', zostan: 'Nein, danke' },
    pl: { tekst: 'Ta strona jest też po polsku.', przejdz: 'Czytaj po polsku', zostan: 'Nie, dziękuję' }
  };
  var t = TEKSTY[przegladarka];
  var baner = document.createElement('div');
  baner.className = 'jezyk-baner';
  baner.setAttribute('lang', przegladarka);
  baner.innerHTML = '<div class="kontener"><p></p><a></a><button type="button"></button></div>';
  baner.querySelector('p').textContent = t.tekst;
  var link = baner.querySelector('a');
  link.textContent = t.przejdz;
  link.href = cel;
  link.hreflang = przegladarka;
  link.addEventListener('click', function () { zapiszJezyk(przegladarka); });
  var zamknij = baner.querySelector('button');
  zamknij.textContent = t.zostan;
  zamknij.addEventListener('click', function () {
    zapiszJezyk(strona);
    baner.remove();
  });
  naglowek.parentNode.insertBefore(baner, naglowek);
})();

// Okno z formularzem wyceny: każdy przycisk „Bezpłatna wycena” (data-wycena albo link do #wycena) otwiera <dialog>.
// Bez obsługi <dialog> zostaje zwykłe przejście do sekcji #wycena na stronie.
(function () {
  'use strict';
  var okno = document.getElementById('okno-wyceny');
  if (!okno || typeof okno.showModal !== 'function') return;
  var strona = okno.querySelector('input[name="strona"]');
  var otwierajacy = null;

  document.addEventListener('click', function (e) {
    var cel = e.target.closest('[data-wycena], a[href="#wycena"], a[href$="/kontakt/#wycena"]');
    if (!cel || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    otwierajacy = cel;
    if (strona) strona.value = location.pathname;
    // usługa zaznaczona w formularzu tej podstrony (np. Rekuperacja) przechodzi do okna
    var naStronie = document.querySelector('#wycena input[name="usluga"]:checked');
    if (naStronie) {
      var wOknie = okno.querySelector('input[name="usluga"][value="' + naStronie.value + '"]');
      if (wOknie) wOknie.checked = true;
    }
    var menu = document.querySelector('.menu-przycisk[aria-expanded="true"]');
    if (menu) menu.click();
    okno.showModal();
    var pole = okno.querySelector('input[name="tel"]');
    if (pole) pole.focus();
  });

  okno.addEventListener('click', function (e) {
    // klik w tło (poza treścią okna) albo w przycisk zamknięcia
    if (e.target === okno || e.target.closest('[data-zamknij]')) okno.close();
  });
  okno.addEventListener('close', function () {
    if (otwierajacy) otwierajacy.focus();
  });
})();

// Lightbox realizacji: zdjęcia jednej realizacji jako galeria (strzałki, klawiatura, przesunięcie palcem).
// Bez obsługi <dialog> zostaje zwykły link do pełnego zdjęcia.
(function () {
  'use strict';
  var linki = document.querySelectorAll('.realizacja__galeria a[href$=".webp"]');
  if (!linki.length || typeof document.createElement('dialog').showModal !== 'function') return;
  var de = document.documentElement.lang === 'de';
  var L = de ? { zamknij: 'Schließen', poprz: 'Vorheriges Foto', nast: 'Nächstes Foto', z: 'von' }
             : { zamknij: 'Zamknij', poprz: 'Poprzednie zdjęcie', nast: 'Następne zdjęcie', z: 'z' };
  var ruch = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var okno = document.createElement('dialog');
  okno.className = 'lightbox';
  okno.setAttribute('aria-label', de ? 'Fotogalerie' : 'Galeria zdjęć');
  okno.innerHTML = '<figure class="lightbox__kadr"><img class="lightbox__zdjecie" alt=""><figcaption class="lightbox__opis">' +
    '<span class="lightbox__tekst"></span><span class="lightbox__licznik" aria-live="polite"></span></figcaption></figure>' +
    '<button class="lightbox__przycisk lightbox__zamknij" type="button" aria-label="' + L.zamknij + '"></button>' +
    '<button class="lightbox__przycisk lightbox__poprz" type="button" aria-label="' + L.poprz + '"></button>' +
    '<button class="lightbox__przycisk lightbox__nast" type="button" aria-label="' + L.nast + '"></button>';
  document.body.appendChild(okno);
  var img = okno.querySelector('.lightbox__zdjecie');
  var tekst = okno.querySelector('.lightbox__tekst');
  var licznik = okno.querySelector('.lightbox__licznik');
  var poprz = okno.querySelector('.lightbox__poprz');
  var nast = okno.querySelector('.lightbox__nast');
  var galeria = [], nr = 0, otwierajacy = null, zmiana = 0;

  function wczytaj(i) { var p = new Image(); p.src = galeria[i].href; return p; }

  function pokaz(i, kierunek) {
    nr = (i + galeria.length) % galeria.length;
    var el = galeria[nr], ten = ++zmiana;
    var gotowe = wczytaj(nr);
    var podmien = function () {
      if (ten !== zmiana) return;
      img.src = el.href;
      img.alt = el.alt;
      tekst.textContent = el.alt;
      licznik.textContent = galeria.length > 1 ? (nr + 1) + ' ' + L.z + ' ' + galeria.length : '';
      img.classList.remove('lightbox__zdjecie--wyjscie', 'lightbox__zdjecie--prawo', 'lightbox__zdjecie--lewo');
      if (ruch && kierunek) {
        img.classList.add(kierunek > 0 ? 'lightbox__zdjecie--prawo' : 'lightbox__zdjecie--lewo');
        void img.offsetWidth;
        img.classList.remove('lightbox__zdjecie--prawo', 'lightbox__zdjecie--lewo');
      }
      if (galeria.length > 1) { wczytaj((nr + 1) % galeria.length); wczytaj((nr - 1 + galeria.length) % galeria.length); }
    };
    if (ruch && kierunek && img.src) {
      img.classList.add('lightbox__zdjecie--wyjscie');
      Promise.all([gotowe.decode ? gotowe.decode().catch(function () {}) : null, new Promise(function (r) { setTimeout(r, 160); })]).then(podmien);
    } else {
      (gotowe.decode ? gotowe.decode().catch(function () {}) : Promise.resolve()).then(podmien);
    }
  }

  Array.prototype.forEach.call(linki, function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var grupa = a.closest('.realizacja__galeria').querySelectorAll('a[href$=".webp"]');
      galeria = Array.prototype.map.call(grupa, function (x) {
        var obraz = x.querySelector('img');
        return { href: x.getAttribute('href'), alt: obraz ? obraz.alt : '' };
      });
      okno.classList.toggle('lightbox--jedno', galeria.length < 2);
      otwierajacy = a;
      img.removeAttribute('src');
      pokaz(Array.prototype.indexOf.call(grupa, a), 0);
      okno.showModal();
      document.documentElement.style.overflow = 'hidden';
    });
  });

  poprz.addEventListener('click', function () { pokaz(nr - 1, -1); });
  nast.addEventListener('click', function () { pokaz(nr + 1, 1); });
  okno.querySelector('.lightbox__zamknij').addEventListener('click', function () { okno.close(); });
  okno.addEventListener('click', function (e) { if (e.target === okno || e.target.classList.contains('lightbox__kadr')) okno.close(); });
  okno.addEventListener('keydown', function (e) {
    if (galeria.length < 2) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); pokaz(nr + 1, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pokaz(nr - 1, -1); }
  });
  okno.addEventListener('close', function () {
    document.documentElement.style.overflow = '';
    if (otwierajacy) otwierajacy.focus();
  });
  // przesunięcie palcem w bok zmienia zdjęcie
  var start = null;
  okno.addEventListener('touchstart', function (e) { start = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
  okno.addEventListener('touchend', function (e) {
    if (!start || galeria.length < 2) return;
    var dx = e.changedTouches[0].clientX - start[0], dy = e.changedTouches[0].clientY - start[1];
    start = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) pokaz(nr + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
})();

// FAQ: płynne rozwijanie i zwijanie odpowiedzi (wysokość animowana, <details> działa też bez JS).
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) return;
  Array.prototype.forEach.call(document.querySelectorAll('.faq details'), function (d) {
    var summary = d.querySelector('summary');
    var anim = null;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var od = d.offsetHeight;
      if (anim) anim.cancel();
      var zamykanie = d.open && !d.classList.contains('faq--zamyka');
      if (zamykanie) {
        d.classList.add('faq--zamyka');
        var do_ = summary.offsetHeight;
        anim = d.animate({ height: [od + 'px', do_ + 'px'] }, { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' });
        anim.onfinish = function () { d.open = false; d.classList.remove('faq--zamyka'); anim = null; };
      } else {
        d.classList.remove('faq--zamyka');
        d.open = true;
        var pelna = d.offsetHeight;
        anim = d.animate({ height: [od + 'px', pelna + 'px'] }, { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' });
        anim.onfinish = function () { anim = null; };
      }
    });
  });
})();
