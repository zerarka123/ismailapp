// Language of the static support page (/support). Same rule as the app: ?lang= → saved choice → browser language.
(function () {
  var ok = { ar: 1, fr: 1, en: 1 };
  var lang = 'ar';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    var saved = localStorage.getItem('marsa.lang');
    lang = ok[q] ? q : ok[saved] ? saved : /^fr/.test(navigator.language) ? 'fr' : /^en/.test(navigator.language) ? 'en' : 'ar';
    if (ok[q]) localStorage.setItem('marsa.lang', q);
  } catch (e) {
    /* storage blocked: Arabic */
  }
  var html = document.documentElement;
  function apply() {
    html.className = 'js l-' + lang;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
  apply();
  document.addEventListener('DOMContentLoaded', function () {
    var h1 = document.querySelector('[data-l="' + lang + '"] h1');
    if (h1) document.title = h1.textContent + ' — ' + (lang === 'ar' ? 'مرسى' : 'Marsa');
    document.querySelectorAll('[data-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        lang = b.getAttribute('data-set');
        try {
          localStorage.setItem('marsa.lang', lang);
        } catch (e) {
          /* ignore */
        }
        apply();
        var t = document.querySelector('[data-l="' + lang + '"] h1');
        if (t) document.title = t.textContent + ' — ' + (lang === 'ar' ? 'مرسى' : 'Marsa');
      });
    });
  });
})();
