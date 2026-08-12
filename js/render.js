/* ================================================
   RENDER.JS — Render gallery, album, timeline, letter + modals
   ================================================
   Depends on: utils.js, data.js
   ================================================ */

/* ---------- Shared state ---------- */
var currentAlbumPage  = 0;
var currentModalIndex = 0;
var _scrollObserver   = null;

/* ================================================
   RENDER ALL
   ================================================ */
function renderAll() {
    renderTimeline();
    renderAlbum();
    renderGallery();
    renderLetter();
}

/* ================================================
   TIMELINE
   ================================================ */
function renderTimeline() {
    var list = document.getElementById('timeline-list');
    list.innerHTML = '';

    appMeta.timeline.forEach(function (item) {
        var el = document.createElement('div');
        el.className = 'timeline-item reveal';
        el.innerHTML =
            '<div class="timeline-card">' +
                '<div class="timeline-item-controls">' +
                    '<button class="tl-ctrl-btn" onclick="openTimelineModal(\'' + item.id + '\')" title="Sửa">✏️</button>' +
                    '<button class="tl-ctrl-btn delete" onclick="confirmDelete(\'Xóa sự kiện?\', function(){ deleteTimeline(\'' + item.id + '\') })" title="Xóa">🗑️</button>' +
                '</div>' +
                '<span class="timeline-icon">' + item.icon + '</span>' +
                '<div class="timeline-date">'  + item.date  + '</div>' +
                '<div class="timeline-event">' + item.event + '</div>' +
                '<p class="timeline-desc">'    + item.desc  + '</p>' +
            '</div>' +
            '<div class="timeline-dot"></div>';
        list.appendChild(el);
    });

    observeReveal();
}

/* ================================================
   ALBUM (PAGE FLIP)
   ================================================ */
function renderAlbum() {
    var pagesEl  = document.getElementById('album-pages');
    var dotsEl   = document.getElementById('album-dots');
    var total    = appMeta.photos.length;

    pagesEl.innerHTML = '';
    dotsEl.innerHTML  = '';

    if (total === 0) {
        pagesEl.innerHTML =
            '<div class="album-page active" style="opacity:1;transform:scale(1);">' +
                '<div style="text-align:center;color:var(--text-muted);">' +
                    '<div style="font-size:3rem;margin-bottom:10px;">📷</div>' +
                    '<div style="font-family:var(--font-display);font-style:italic;">Chưa có ảnh nào. Hãy thêm ảnh vào album!</div>' +
                '</div>' +
            '</div>';
        document.getElementById('album-counter').textContent = '0 / 0';
        return;
    }

    /* Clamp currentAlbumPage */
    if (currentAlbumPage >= total) currentAlbumPage = total - 1;
    if (currentAlbumPage < 0)      currentAlbumPage = 0;

    appMeta.photos.forEach(function (photo, idx) {
        var page = document.createElement('div');
        page.className  = 'album-page' + (idx === currentAlbumPage ? ' active' : '');
        page.dataset.page = idx;

        var src = getPhotoSrc(photo);
        page.innerHTML =
            '<img class="album-page-img" src="' + src + '" alt="Kỷ niệm ' + (idx + 1) + '" loading="lazy">' +
            '<div class="album-page-caption">' + photo.albumCaption + '</div>' +
            '<div class="album-page-number">Trang ' + (idx + 1) + ' / ' + total + '</div>' +
            '<button class="album-caption-edit-btn" onclick="openEditCaption(\'' + photo.id + '\')">✏️ Sửa caption</button>';

        pagesEl.appendChild(page);

        var dot = document.createElement('span');
        dot.className = 'album-dot' + (idx === currentAlbumPage ? ' active' : '');
        (function (i) { dot.onclick = function () { albumGoTo(i); }; }(idx));
        dotsEl.appendChild(dot);
    });

    _updateAlbumUI();
}

function _updateAlbumUI() {
    var total = appMeta.photos.length;
    document.getElementById('album-counter').textContent =
        total > 0 ? (currentAlbumPage + 1) + ' / ' + total : '0 / 0';
    document.getElementById('album-prev').disabled = currentAlbumPage === 0;
    document.getElementById('album-next').disabled = currentAlbumPage >= total - 1;
}

function albumGoTo(idx) {
    var pages = document.querySelectorAll('.album-page');
    var dots  = document.querySelectorAll('.album-dot');
    if (pages[currentAlbumPage]) pages[currentAlbumPage].classList.remove('active');
    if (dots[currentAlbumPage])  dots[currentAlbumPage].classList.remove('active');
    currentAlbumPage = idx;
    if (pages[currentAlbumPage]) pages[currentAlbumPage].classList.add('active');
    if (dots[currentAlbumPage])  dots[currentAlbumPage].classList.add('active');
    _updateAlbumUI();
}
function albumNext() { if (currentAlbumPage < appMeta.photos.length - 1) albumGoTo(currentAlbumPage + 1); }
function albumPrev() { if (currentAlbumPage > 0) albumGoTo(currentAlbumPage - 1); }

/* ================================================
   GALLERY
   ================================================ */
function renderGallery() {
    var grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';

    appMeta.photos.forEach(function (photo, idx) {
        var card     = document.createElement('div');
        card.className = 'gallery-card reveal';

        var src = getPhotoSrc(photo);
        card.innerHTML =
            '<div class="photo-edit-controls">' +
                '<button class="photo-delete-btn" onclick="confirmDelete(\'Xóa ảnh này?\', function(){ deletePhoto(\'' + photo.id + '\') })">✕</button>' +
                '<button class="photo-caption-btn" onclick="openEditCaption(\'' + photo.id + '\')">✏️ Caption</button>' +
            '</div>' +
            '<img src="' + src + '" alt="Kỷ niệm ' + (idx + 1) + '" loading="lazy">' +
            '<span class="gallery-card-label">' + String(idx + 1).padStart(2, '0') + '</span>';

        if (!editMode) {
            (function (i) {
                card.addEventListener('click', function () { openModal(i); });
            }(idx));
        }
        grid.appendChild(card);
    });

    /* Add-photo card when in edit mode */
    if (editMode) {
        var addCard = document.createElement('div');
        addCard.className = 'add-photo-card';
        addCard.innerHTML =
            '<div class="add-photo-content">' +
                '<span class="add-icon">➕</span>' +
                '<span>Thêm ảnh</span>' +
            '</div>';
        addCard.addEventListener('click', function () { openAdminModal('modal-add-photo'); });
        grid.appendChild(addCard);
    }

    observeReveal();
}

/* ================================================
   LETTER
   ================================================ */
function renderLetter() {
    var l = appMeta.letter;
    document.getElementById('letter-greeting').textContent = l.greeting;
    document.getElementById('letter-body').innerHTML      = l.body.replace(/\n/g, '<br>');
    document.getElementById('letter-signature').innerHTML = l.signature.replace(/\n/g, '<br>');
}

/* ================================================
   LIGHTBOX MODAL
   ================================================ */
var _modal, _modalImg;

function initLightbox() {
    _modal    = document.getElementById('imageModal');
    _modalImg = document.getElementById('modalImg');

    _modal.addEventListener('click', function (e) { if (e.target === _modal) closeModal(); });

    /* Swipe support */
    var tx = 0;
    _modal.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].screenX; }, { passive: true });
    _modal.addEventListener('touchend',   function (e) {
        var diff = tx - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 50) { if (diff > 0) modalNext(e); else modalPrev(e); }
    }, { passive: true });
}

function openModal(idx) {
    if (editMode) return;
    currentModalIndex = idx;
    _modal.style.display = 'flex';
    _modalImg.src = getPhotoSrc(appMeta.photos[idx]);
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    _modal.style.display = 'none';
    _modalImg.src = '';
    document.body.style.overflow = '';
}
function modalNext(e) {
    if (e) e.stopPropagation();
    currentModalIndex = (currentModalIndex + 1) % appMeta.photos.length;
    _modalImg.src = getPhotoSrc(appMeta.photos[currentModalIndex]);
}
function modalPrev(e) {
    if (e) e.stopPropagation();
    currentModalIndex = (currentModalIndex - 1 + appMeta.photos.length) % appMeta.photos.length;
    _modalImg.src = getPhotoSrc(appMeta.photos[currentModalIndex]);
}

/* ================================================
   SCROLL REVEAL (IntersectionObserver)
   ================================================ */
function observeReveal() {
    if (!_scrollObserver) {
        _scrollObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    }
    document.querySelectorAll('.reveal').forEach(function (el) {
        _scrollObserver.observe(el);
    });
}

/* ================================================
   ALBUM SWIPE (init after DOM ready)
   ================================================ */
function initAlbumSwipe() {
    var book = document.getElementById('album-book');
    var tx   = 0;
    book.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].screenX; }, { passive: true });
    book.addEventListener('touchend',   function (e) {
        var diff = tx - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 50) { if (diff > 0) albumNext(); else albumPrev(); }
    }, { passive: true });
}
