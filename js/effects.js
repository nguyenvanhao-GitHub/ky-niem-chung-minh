/* ================================================
   EFFECTS.JS — Particles, counter, music, hearts, scroll-top
   ================================================
   Depends on: utils.js, data.js
   ================================================ */

/* ================================================
   PARTICLES BACKGROUND
   ================================================ */
var _particles = [];
var _canvas, _ctx;

function initParticles() {
    _canvas = document.getElementById('particles-canvas');
    _ctx    = _canvas.getContext('2d');

    function resize() { _canvas.width = window.innerWidth; _canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    var count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    _particles = [];
    for (var i = 0; i < count; i++) _particles.push(new Particle());
    _animateParticles();
}

function Particle() { this.reset(); }
Particle.prototype.reset = function () {
    this.x      = Math.random() * _canvas.width;
    this.y      = Math.random() * _canvas.height;
    this.size   = Math.random() * 2.5 + 0.5;
    this.vx     = (Math.random() - 0.5) * 0.3;
    this.vy     = (Math.random() - 0.5) * 0.3;
    this.alpha  = Math.random() * 0.5 + 0.1;
    this.fade   = Math.random() > 0.5 ? 1 : -1;
    var cols    = ['rgba(255,107,138,', 'rgba(240,194,127,', 'rgba(255,255,255,'];
    this.color  = cols[Math.floor(Math.random() * cols.length)];
};
Particle.prototype.update = function () {
    this.x += this.vx; this.y += this.vy;
    this.alpha += this.fade * 0.003;
    if (this.alpha >= 0.6) this.fade = -1;
    if (this.alpha <= 0.05) this.fade = 1;
    if (this.x < -10 || this.x > _canvas.width + 10 ||
        this.y < -10 || this.y > _canvas.height + 10) this.reset();
};
Particle.prototype.draw = function () {
    _ctx.beginPath();
    _ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    _ctx.fillStyle = this.color + this.alpha + ')';
    _ctx.fill();
};

function _animateParticles() {
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    for (var i = 0; i < _particles.length; i++) {
        _particles[i].update();
        _particles[i].draw();
        /* Draw connecting lines between close particles */
        for (var j = i + 1; j < _particles.length; j++) {
            var dx = _particles[i].x - _particles[j].x;
            var dy = _particles[i].y - _particles[j].y;
            var d  = Math.sqrt(dx * dx + dy * dy);
            if (d < 110) {
                _ctx.beginPath();
                _ctx.moveTo(_particles[i].x, _particles[i].y);
                _ctx.lineTo(_particles[j].x, _particles[j].y);
                _ctx.strokeStyle = 'rgba(255,143,163,' + ((1 - d / 110) * 0.07) + ')';
                _ctx.lineWidth = 0.5;
                _ctx.stroke();
            }
        }
    }
    requestAnimationFrame(_animateParticles);
}

/* ================================================
   LOVE COUNTER
   ================================================ */
var _counterInterval = null;

function updateCounter() {
    var start = new Date(appMeta.startDate).getTime();
    var diff  = Date.now() - start;
    if (diff < 0) {
        ['days','hours','minutes','seconds'].forEach(function (id) {
            document.getElementById(id).textContent = '0';
        });
        return;
    }
    var days    = Math.floor(diff / 86400000);
    var hours   = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);

    document.getElementById('days').textContent    = days;
    document.getElementById('hours').textContent   = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

function initCounter() {
    updateCounter();
    _counterInterval = setInterval(updateCounter, 1000);
}

/* ================================================
   MUSIC PLAYER
   ================================================ */
var isMusicPlaying = false;
var _bgMusic, _musicToggle, _musicInfo, _musicBars;

function initMusicPlayer() {
    _bgMusic      = document.getElementById('bg-music');
    _musicToggle  = document.getElementById('music-toggle');
    _musicInfo    = document.getElementById('music-info');
    _musicBars    = document.querySelectorAll('.music-bar');

    _bgMusic.addEventListener('pause', function () { if (!_bgMusic.ended) setMusicPlaying(false); });
    _bgMusic.addEventListener('play',  function () { setMusicPlaying(true); });
}

function setMusicPlaying(playing) {
    isMusicPlaying = playing;
    _musicToggle.classList.toggle('playing', playing);
    _musicToggle.textContent = playing ? '🎵' : '🔇';
    _musicInfo.classList.toggle('show', playing);
    _musicBars.forEach(function (b) { b.classList.toggle('paused', !playing); });
}

function toggleMusic() {
    if (isMusicPlaying) {
        _bgMusic.pause();
        setMusicPlaying(false);
    } else {
        _bgMusic.volume = 0.5;
        _bgMusic.play()
            .then(function () { setMusicPlaying(true); })
            .catch(function () {});
    }
}

function startMusicAutoplay() {
    _bgMusic.volume = 0.5;
    _bgMusic.play()
        .then(function () { setMusicPlaying(true); })
        .catch(function () { /* autoplay blocked */ });
}

/* ================================================
   CLICK HEARTS
   ================================================ */
function initClickHearts() {
    var icons = ['❤️', '💕', '💖', '✨', '💗'];
    document.addEventListener('click', function (e) {
        /* Ignore if welcome screen still visible */
        var ws = document.getElementById('welcome-screen');
        if (ws && ws.style.display !== 'none') return;

        /* Ignore clicks on UI controls */
        if (e.target.closest('.admin-modal-overlay') ||
            e.target.closest('.music-floating')       ||
            e.target.closest('.edit-fab')             ||
            e.target.closest('.scroll-top-btn')       ||
            e.target.closest('.modal-overlay')        ||
            e.target.closest('.photo-edit-controls')  ||
            e.target.closest('.timeline-item-controls') ||
            e.target.closest('.add-timeline-btn')     ||
            e.target.closest('.letter-edit-btn')      ||
            e.target.closest('.album-caption-edit-btn')) return;

        var h = document.createElement('div');
        h.className   = 'click-heart';
        h.textContent = icons[Math.floor(Math.random() * icons.length)];
        h.style.left  = e.clientX + 'px';
        h.style.top   = e.clientY + 'px';
        document.body.appendChild(h);
        setTimeout(function () { h.remove(); }, 1200);
    });
}

/* ================================================
   SCROLL-TO-TOP
   ================================================ */
function initScrollTop() {
    var btn = document.getElementById('scroll-top');
    window.addEventListener('scroll', function () {
        btn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
