/* ============================================================
   CN Labs — wire the theory
   js/main.js — كل التفاعلات (بدون أي مكتبات خارجية)
   [1] شريط تقدم القراءة + زر العودة للأعلى
   [2] الطرفيات التفاعلية (تشغيل بتأثير الآلة الكاتبة + نسخ)
   [3] الاختبار التفاعلي + النتيجة
   [4] جدول التدريب (كشف الإجابات)
   [5] الظهور الهادئ عند التمرير
   [6] وضع التركيز (Focus Mode): تنقل خطي + شريط تقدم
   ============================================================ */
(function () {
  "use strict";

  /* ---------- [1] شريط تقدم القراءة + زر العودة للأعلى ---------- */
  var bar = document.getElementById('progress');
  var toTop = document.getElementById('toTop');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    toTop.classList.toggle('show', h.scrollTop > 600);
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- [2] الطرفيات التفاعلية (مقتبس من labs-sci) ---------- */
  /* كتابة السطر تدريجياً مع الحفاظ على الوسوم الداخلية (spans الملونة) */
  function revealLine(line, done) {
    line.style.display = 'block';
    var full = line.innerHTML;
    var tmp = document.createElement('div'); tmp.innerHTML = full;
    var textLen = tmp.textContent.length;
    var i = 0;
    line.innerHTML = '';
    var caret = document.createElement('span'); caret.className = 'caret';
    line.appendChild(caret);
    var speed = 14; /* مللي ثانية لكل محرف */
    (function type() {
      i++;
      var shown = 0, out = '';
      (function walk(node) {
        for (var k = 0; k < node.childNodes.length; k++) {
          var ch = node.childNodes[k];
          if (ch.nodeType === 3) {
            var take = Math.min(ch.textContent.length, Math.max(0, i - shown));
            out += ch.textContent.slice(0, take); shown += ch.textContent.length;
          } else {
            var inner = '';
            for (var j = 0; j < ch.childNodes.length; j++) {
              var cc = ch.childNodes[j];
              if (cc.nodeType === 3) {
                var take2 = Math.min(cc.textContent.length, Math.max(0, i - shown));
                inner += cc.textContent.slice(0, take2); shown += cc.textContent.length;
              }
            }
            out += '<' + ch.tagName.toLowerCase() + ' class="' + ch.className + '">' + inner + '</' + ch.tagName.toLowerCase() + '>';
          }
        }
      })(tmp);
      line.innerHTML = out;
      line.appendChild(caret);
      if (i < textLen) { setTimeout(type, speed); }
      else { line.innerHTML = full; done(); }
    })();
  }

  document.querySelectorAll('.term').forEach(function (term) {
    var btn = term.querySelector('.run-btn');
    var copyBtn = term.querySelector('.copy-btn');
    var outs = Array.prototype.slice.call(term.querySelectorAll('.tl.out'));
    var originals = outs.map(function (l) { return l.innerHTML; });
    var running = false;

    btn.addEventListener('click', function () {
      if (running) return;
      /* إعادة: إذا انتهى سابقاً، أخفِ الأسطر وابدأ من جديد */
      outs.forEach(function (l, idx) { l.style.display = 'none'; l.innerHTML = originals[idx]; });
      running = true;
      btn.disabled = true;
      btn.textContent = '⏳ جارٍ التنفيذ…';
      var idx = 0;
      (function next() {
        if (idx >= outs.length) {
          running = false;
          btn.disabled = false;
          btn.textContent = '↺ إعادة التشغيل';
          return;
        }
        var line = outs[idx++];
        /* فواصل زمنية واقعية بين الحزم */
        setTimeout(function () { revealLine(line, next); }, line.textContent.indexOf('Reply') > -1 ? 350 : 120);
      })();
    });

    copyBtn.addEventListener('click', function () {
      var cmds = Array.prototype.slice.call(term.querySelectorAll('.tl:not(.out)'))
        .map(function (l) {
          var c = l.querySelector('.c');
          return c ? c.textContent : l.textContent;
        }).join('\n');
      var done = function () {
        copyBtn.textContent = '✔ تم النسخ';
        setTimeout(function () { copyBtn.textContent = '📋 نسخ الأوامر'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmds).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = cmds; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { }
        document.body.removeChild(ta); done();
      }
    });
  });

  /* ---------- [3] الاختبارات التفاعلية + النتيجة (يدعم عدة اختبارات في الصفحة) ---------- */
  document.querySelectorAll('.quiz').forEach(function (quizBox) {
    var scoreEl = quizBox.querySelector('.quiz-score');
    function updateScore() {
      if (!scoreEl) return;
      var total = quizBox.querySelectorAll('.q').length;
      var answered = quizBox.querySelectorAll('.q.answered').length;
      var correct = quizBox.querySelectorAll('.q.answered.ok').length;
      if (answered === total) {
        scoreEl.textContent = '🏁 انتهيت! نتيجتك: ' + correct + ' من ' + total +
          (correct === total ? ' — ممتاز! إتقان كامل 🎉' : correct >= total / 2 ? ' — جيد جداً، راجع البطاقات المرتبطة بالأسئلة المخطئة.' : ' — لا بأس، أعد قراءة البطاقات وستتحسن 💪');
        scoreEl.classList.add('show');
      }
    }
    quizBox.querySelectorAll('.q').forEach(function (q) {
      var answer = parseInt(q.getAttribute('data-answer'), 10);
      var opts = q.querySelectorAll('.opt');
      var good = q.querySelector('.fb.good');
      var bad = q.querySelector('.fb.bad');
      opts.forEach(function (opt, i) {
        opt.addEventListener('click', function () {
          opts.forEach(function (o) { o.classList.remove('correct', 'wrong'); o.disabled = false; });
          if (i === answer) {
            opt.classList.add('correct');
            good.classList.add('show'); bad.classList.remove('show');
            q.classList.add('answered', 'ok');
          } else {
            opt.classList.add('wrong');
            opts[answer].classList.add('correct');
            bad.classList.add('show'); good.classList.remove('show');
            q.classList.add('answered');
          }
          opts.forEach(function (o) { o.disabled = true; });
          updateScore();
        });
      });
    });
  });

  /* ---------- [4] جداول التدريب: كشف الإجابات بالنقر (يدعم عدة جداول مستقلة) ---------- */
  document.querySelectorAll('.drill td.ans').forEach(function (td) {
    td.setAttribute('title', 'اضغط لكشف الإجابة');
    td.addEventListener('click', function () { td.classList.toggle('revealed'); });
  });
  document.querySelectorAll('.reveal-all').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var scope = btn.closest('.drill') || document;
      var cells = scope.querySelectorAll('td.ans');
      var allShown = Array.prototype.every.call(cells, function (td) { return td.classList.contains('revealed'); });
      cells.forEach(function (td) { td.classList.toggle('revealed', !allShown); });
      btn.textContent = allShown ? 'إظهار جميع الإجابات' : 'إخفاء جميع الإجابات';
    });
  });

  /* ---------- [5] الظهور الهادئ للبطاقات عند التمرير ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.card, .section-opener');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (t) { t.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- [6] وضع التركيز (Focus Mode) ---------- */
  var body = document.body;
  var wrap = document.getElementById('mainWrap');
  var focusBtn = document.getElementById('focusBtn');
  var focusBtnHero = document.getElementById('focusBtnHero');
  var focusExit = document.getElementById('focusExit');
  var focusCounter = document.getElementById('focusCounter');
  var focusFill = document.getElementById('focusFill');
  var focusPct = document.getElementById('focusPct');

  /* خطوات التركيز = فواصل الأقسام + البطاقات بترتيبها في الصفحة */
  var steps = Array.prototype.slice.call(wrap.querySelectorAll('.section-opener, .card'));
  var current = 0;
  var STORAGE_KEY = 'cnlabs-focus-step';

  /* حقن أزرار التنقل داخل كل خطوة */
  steps.forEach(function (step, i) {
    var nav = document.createElement('div');
    nav.className = 'focus-nav';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'fbtn prev'; prev.textContent = '→ السابق';
    prev.addEventListener('click', function () { goTo(i - 1); });
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'fbtn next'; next.textContent = 'التالي ←';
    next.addEventListener('click', function () { goTo(i + 1); });
    var pos = document.createElement('span');
    pos.className = 'fpos';
    nav.appendChild(prev); nav.appendChild(next); nav.appendChild(pos);
    step.appendChild(nav);
  });

  function renderFocus() {
    steps.forEach(function (s, i) {
      s.classList.toggle('focus-active', i === current);
      var nav = s.querySelector('.focus-nav');
      if (nav) {
        nav.querySelector('.prev').disabled = (current === 0);
        nav.querySelector('.next').disabled = (current === steps.length - 1);
        nav.querySelector('.fpos').textContent = (current + 1) + ' من ' + steps.length;
      }
    });
    var pct = Math.round(((current + 1) / steps.length) * 100);
    focusCounter.textContent = 'البطاقة ' + (current + 1) + ' من ' + steps.length;
    focusFill.style.width = pct + '%';
    focusPct.textContent = pct + '%';
    try { localStorage.setItem(STORAGE_KEY, String(current)); } catch (e) { }
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  function goTo(i) {
    if (i < 0 || i >= steps.length) return;
    current = i;
    renderFocus();
  }

  function enterFocus() {
    /* استئناف من آخر موضع محفوظ */
    var saved = 0;
    try { saved = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0; } catch (e) { }
    current = Math.min(Math.max(saved, 0), steps.length - 1);
    body.classList.add('focus');
    renderFocus();
  }

  function exitFocus() {
    body.classList.remove('focus');
    steps.forEach(function (s) { s.classList.remove('focus-active'); });
    /* العودة إلى موضع آخر بطاقة في التدفق العادي */
    var last = steps[current];
    if (last && last.id) { location.hash = last.id; }
    else if (last) { last.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  }

  focusBtn.addEventListener('click', function () {
    body.classList.contains('focus') ? exitFocus() : enterFocus();
  });
  if (focusBtnHero) { focusBtnHero.addEventListener('click', enterFocus); }
  focusExit.addEventListener('click', exitFocus);

  /* لوحة المفاتيح: في RTL السهم الأيسر = التالي، الأيمن = السابق، Esc = خروج */
  document.addEventListener('keydown', function (e) {
    if (!body.classList.contains('focus')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current + 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current - 1); }
    else if (e.key === 'Escape') { exitFocus(); }
  });
})();
