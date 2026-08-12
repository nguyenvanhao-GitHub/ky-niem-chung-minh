/* ================================================
   EDIT.JS — Edit mode toggle + full CRUD + Sync/Backup
   ================================================
   Depends on: utils.js, data.js, render.js, effects.js
   ================================================ */

/* ---------- State ---------- */
var editMode        = false;
var pendingPhotos   = [];   // [{ blob, previewURL, caption }]
var selectedIcon    = '💖';
var _editCaptionId  = null;

/* ================================================
   EDIT MODE TOGGLE
   ================================================ */
function toggleEditMode() {
    editMode = !editMode;
    var fab = document.getElementById('edit-fab');
    document.body.classList.toggle('edit-mode', editMode);

    if (editMode) {
        fab.textContent = '✓ Xong chỉnh sửa';
        fab.classList.add('active');
        showToast('✏️ Chế độ chỉnh sửa đang bật', 'success');
    } else {
        fab.textContent = '✏️ Chỉnh sửa';
        fab.classList.remove('active');
        showToast('✅ Đã lưu tất cả thay đổi', 'success');
    }

    renderGallery();
}

/* ================================================
   PHOTO CRUD
   ================================================ */
function handleFileSelect(files) {
    var progress = document.getElementById('upload-progress');
    var bar      = document.getElementById('progress-bar');
    var label    = document.getElementById('progress-label');

    var arr   = Array.from(files).filter(function (f) { return f.type.startsWith('image/'); });
    var total = arr.length;
    if (!total) return;

    progress.classList.add('show');
    label.textContent = 'Đang nén ' + total + ' ảnh...';
    bar.style.width   = '0%';

    var done = 0;
    arr.forEach(function (file) {
        compressToBlob(file).then(function (blob) {
            var url = URL.createObjectURL(blob);
            pendingPhotos.push({ blob: blob, previewURL: url, caption: '' });
            done++;
            bar.style.width = Math.round((done / total) * 100) + '%';
            if (done === total) {
                label.textContent = 'Nén xong ' + total + ' ảnh!';
                setTimeout(function () { progress.classList.remove('show'); }, 800);
            }
            renderPreviewGrid();
        });
    });
}

function renderPreviewGrid() {
    var grid = document.getElementById('preview-grid');
    grid.innerHTML = '';
    pendingPhotos.forEach(function (p, idx) {
        var item = document.createElement('div');
        item.innerHTML =
            '<div class="preview-item">' +
                '<img src="' + p.previewURL + '" alt="Preview">' +
                '<button class="preview-remove" onclick="removePending(' + idx + ')">✕</button>' +
            '</div>' +
            '<div class="preview-caption-wrap">' +
                '<input class="preview-caption-input" placeholder="Caption..." value="' + p.caption + '" ' +
                    'oninput="pendingPhotos[' + idx + '].caption = this.value">' +
            '</div>';
        grid.appendChild(item);
    });
}

function removePending(idx) {
    URL.revokeObjectURL(pendingPhotos[idx].previewURL);
    pendingPhotos.splice(idx, 1);
    renderPreviewGrid();
}

function confirmAddPhotos() {
    if (pendingPhotos.length === 0) { showToast('Chưa chọn ảnh nào!', 'error'); return; }

    var promises = pendingPhotos.map(function (p) {
        var id = genId();
        return storePhotoBlob(id, p.blob).then(function () {
            objectURLMap[id] = URL.createObjectURL(p.blob);
            appMeta.photos.push({
                id:           id,
                albumCaption: p.caption || 'Kỷ niệm của chúng mình 💕',
                isDefault:    false
            });
            URL.revokeObjectURL(p.previewURL);
        });
    });

    Promise.all(promises).then(function () {
        if (saveMetadata()) {
            showToast('✅ Đã thêm ' + pendingPhotos.length + ' ảnh!', 'success');
            pendingPhotos = [];
            document.getElementById('preview-grid').innerHTML = '';
            document.getElementById('file-input').value = '';
            closeAdminModal('modal-add-photo');
            renderGallery();
            renderAlbum();
        }
    }).catch(function (err) {
        showToast('⚠️ Lỗi khi lưu ảnh: ' + err.message, 'error');
        console.error(err);
    });
}

function deletePhoto(id) {
    var idx = appMeta.photos.findIndex(function (p) { return p.id === id; });
    if (idx === -1) return;

    appMeta.photos.splice(idx, 1);
    saveMetadata();

    deletePhotoBlob(id).catch(function (e) { console.warn('deletePhotoBlob error', e); });
    revokeURL(id);

    if (currentAlbumPage >= appMeta.photos.length) {
        currentAlbumPage = Math.max(0, appMeta.photos.length - 1);
    }

    showToast('🗑️ Đã xóa ảnh', 'success');
    renderGallery();
    renderAlbum();
}

/* ---- Edit Caption ---- */
function openEditCaption(id) {
    _editCaptionId = id;
    var photo = appMeta.photos.find(function (p) { return p.id === id; });
    if (!photo) return;
    document.getElementById('edit-caption-text').value = photo.albumCaption;
    openAdminModal('modal-edit-caption');
}

function saveCaption() {
    var text = document.getElementById('edit-caption-text').value.trim();
    if (!text) { showToast('Caption không được để trống!', 'error'); return; }

    var photo = appMeta.photos.find(function (p) { return p.id === _editCaptionId; });
    if (!photo) return;
    photo.albumCaption = text;

    if (saveMetadata()) {
        showToast('✅ Đã lưu caption', 'success');
        closeAdminModal('modal-edit-caption');
        renderAlbum();
        renderGallery();
    }
}

/* ================================================
   TIMELINE CRUD
   ================================================ */
var _timelineEditId = null;

function openTimelineModal(id) {
    _timelineEditId = id || null;
    var isEdit = !!id;

    document.getElementById('timeline-modal-title').textContent = isEdit ? '✏️ Sửa sự kiện' : '📅 Thêm sự kiện';
    document.getElementById('tl-date').value  = '';
    document.getElementById('tl-event').value = '';
    document.getElementById('tl-desc').value  = '';
    selectIcon('💖');

    if (isEdit) {
        var item = appMeta.timeline.find(function (t) { return t.id === id; });
        if (!item) return;
        document.getElementById('tl-date').value  = item.date;
        document.getElementById('tl-event').value = item.event;
        document.getElementById('tl-desc').value  = item.desc;
        selectIcon(item.icon);
    }

    openAdminModal('modal-timeline');
}

function selectIcon(icon) {
    selectedIcon = icon;
    document.querySelectorAll('.icon-opt').forEach(function (el) {
        el.classList.toggle('selected', el.dataset.icon === icon);
    });
}

function saveTimelineItem() {
    var date  = document.getElementById('tl-date').value.trim();
    var event = document.getElementById('tl-event').value.trim();
    var desc  = document.getElementById('tl-desc').value.trim();

    if (!date || !event) { showToast('Vui lòng điền ngày và tên sự kiện!', 'error'); return; }

    if (_timelineEditId) {
        var item = appMeta.timeline.find(function (t) { return t.id === _timelineEditId; });
        if (!item) return;
        item.icon  = selectedIcon;
        item.date  = date;
        item.event = event;
        item.desc  = desc;
    } else {
        appMeta.timeline.push({ id: genId(), icon: selectedIcon, date: date, event: event, desc: desc });
    }

    if (saveMetadata()) {
        showToast(_timelineEditId ? '✅ Đã cập nhật sự kiện' : '✅ Đã thêm sự kiện!', 'success');
        closeAdminModal('modal-timeline');
        renderTimeline();
    }
}

function deleteTimeline(id) {
    var idx = appMeta.timeline.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    appMeta.timeline.splice(idx, 1);
    if (saveMetadata()) {
        showToast('🗑️ Đã xóa sự kiện', 'success');
        renderTimeline();
    }
}

/* ================================================
   LETTER EDIT
   ================================================ */
function openLetterModal() {
    document.getElementById('letter-greeting-input').value = appMeta.letter.greeting;
    document.getElementById('letter-body-input').value     = appMeta.letter.body;
    document.getElementById('letter-sig-input').value      = appMeta.letter.signature;
    openAdminModal('modal-letter');
}

function saveLetter() {
    var greeting = document.getElementById('letter-greeting-input').value.trim();
    var body     = document.getElementById('letter-body-input').value.trim();
    var sig      = document.getElementById('letter-sig-input').value.trim();

    if (!greeting || !body) { showToast('Vui lòng điền đầy đủ!', 'error'); return; }

    appMeta.letter = { greeting: greeting, body: body, signature: sig };
    if (saveMetadata()) {
        showToast('✅ Đã lưu lời muốn nói', 'success');
        closeAdminModal('modal-letter');
        renderLetter();
    }
}

/* ================================================
   CONFIRM DELETE DIALOG
   ================================================ */
function confirmDelete(msg, onConfirm) {
    document.getElementById('confirm-msg').textContent = msg;
    var btn = document.getElementById('confirm-yes-btn');
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', function () {
        closeAdminModal('modal-confirm');
        onConfirm();
    });
    openAdminModal('modal-confirm');
}

/* ================================================
   MODAL HELPERS
   ================================================ */
function openAdminModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeAdminModal(id) {
    document.getElementById(id).classList.remove('show');
    if (id === 'modal-add-photo') {
        pendingPhotos.forEach(function (p) { URL.revokeObjectURL(p.previewURL); });
        pendingPhotos = [];
        document.getElementById('preview-grid').innerHTML = '';
        var fi = document.getElementById('file-input');
        if (fi) fi.value = '';
        document.getElementById('upload-progress').classList.remove('show');
    }
}

/* ================================================
   INIT EVENT LISTENERS
   ================================================ */
function initEditListeners() {
    document.querySelectorAll('.admin-modal-overlay').forEach(function (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeAdminModal(overlay.id);
        });
    });

    var dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover',  function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function ()  { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop',      function (e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFileSelect(e.dataTransfer.files);
    });

    document.getElementById('icon-picker').addEventListener('click', function (e) {
        var opt = e.target.closest('.icon-opt');
        if (opt) selectIcon(opt.dataset.icon);
    });

    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key === 'e') { e.preventDefault(); toggleEditMode(); }

        var modal = document.getElementById('imageModal');
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Escape')      closeModal();
            if (e.key === 'ArrowRight') { e.preventDefault(); modalNext(e); }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); modalPrev(e); }
        } else if (!editMode) {
            if (e.key === 'ArrowRight') albumNext();
            if (e.key === 'ArrowLeft')  albumPrev();
        }
    });
}
