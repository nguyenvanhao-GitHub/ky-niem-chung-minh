/* ================================================
   APP.JS — Application entry point & orchestration
   ================================================
   Load order: utils → data → effects → render → edit → app
   ================================================ */

/* ================================================
   START EXPERIENCE (called from welcome button)
   ================================================ */
function startExperience() {
    var welcome = document.getElementById('welcome-screen');
    welcome.style.opacity = '0';

    setTimeout(function () {
        welcome.style.display = 'none';
        var main = document.getElementById('main-content');
        main.style.display = 'block';

        /* Small delay to let display:block take effect before opacity transition */
        requestAnimationFrame(function () {
            main.style.opacity = '1';
            startMusicAutoplay();
            document.getElementById('couple-video').play().catch(function () {});
            observeReveal();
        });
    }, 1500);
}

/* ================================================
   BOOTSTRAP — runs on DOMContentLoaded
   ================================================ */
document.addEventListener('DOMContentLoaded', function () {

    /* 1. Load data (IndexedDB + localStorage), then boot UI */
    initData()
        .then(function () {

            /* 2. Render all data-driven sections */
            renderAll();

            /* 3. Start visual effects */
            initParticles();
            initCounter();
            initMusicPlayer();
            initClickHearts();
            initScrollTop();

            /* 4. Init interactive behaviours */
            initLightbox();
            initAlbumSwipe();
            initEditListeners();

            /* 5. Run scroll reveal on static .reveal elements */
            observeReveal();

            console.info('[Album] App ready ✔');
        })
        .catch(function (err) {
            console.error('[Album] Init error:', err);
            showToast('⚠️ Lỗi khởi động ứng dụng!', 'error');
        });
});
