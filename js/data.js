/* ================================================
   DATA.JS — Data layer: IndexedDB (blobs) + localStorage (metadata)
   ================================================
   Depends on: utils.js
   ================================================ */

/* ---------- State ---------- */
var appMeta      = null;   // { photos, timeline, letter, startDate }
var objectURLMap = {};     // id → objectURL  (for uploaded photos)
var _db          = null;   // cached IDB connection

/* ================================================
   INDEXEDDB — stores photo blobs
   ================================================ */
function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains(PHOTO_STORE)) {
                db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
        req.onerror   = function (e) { reject(e.target.error); };
    });
}

function storePhotoBlob(id, blob) {
    return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
            var tx  = db.transaction(PHOTO_STORE, 'readwrite');
            tx.objectStore(PHOTO_STORE).put({ id: id, blob: blob });
            tx.oncomplete = resolve;
            tx.onerror    = function (e) { reject(e.target.error); };
        });
    });
}

function getPhotoBlob(id) {
    return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
            var tx  = db.transaction(PHOTO_STORE, 'readonly');
            var req = tx.objectStore(PHOTO_STORE).get(id);
            req.onsuccess = function (e) { resolve(e.target.result ? e.target.result.blob : null); };
            req.onerror   = function (e) { reject(e.target.error); };
        });
    });
}

function deletePhotoBlob(id) {
    return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
            var tx = db.transaction(PHOTO_STORE, 'readwrite');
            tx.objectStore(PHOTO_STORE).delete(id);
            tx.oncomplete = resolve;
            tx.onerror    = function (e) { reject(e.target.error); };
        });
    });
}

/* ================================================
   OBJECT URL CACHE
   ================================================ */
function getPhotoSrc(photo) {
    if (photo.isDefault) return photo.src;
    return objectURLMap[photo.id] || '';
}

function revokeURL(id) {
    if (objectURLMap[id]) {
        URL.revokeObjectURL(objectURLMap[id]);
        delete objectURLMap[id];
    }
}

/* Preload all object URLs for uploaded photos */
function loadAllImageURLs() {
    var nonDefaults = appMeta.photos.filter(function (p) { return !p.isDefault; });
    var promises = nonDefaults.map(function (p) {
        return getPhotoBlob(p.id).then(function (blob) {
            if (blob) {
                revokeURL(p.id);
                objectURLMap[p.id] = URL.createObjectURL(blob);
            }
        }).catch(function (err) {
            console.warn('Could not load image', p.id, err);
        });
    });
    return Promise.all(promises);
}

/* ================================================
   LOCALSTORAGE — stores text metadata
   ================================================ */
function loadMetadata() {
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            var d = JSON.parse(saved);
            if (!d.photos)    d.photos    = deepClone(DEFAULT_PHOTOS);
            if (!d.timeline)  d.timeline  = deepClone(DEFAULT_TIMELINE);
            if (!d.letter)    d.letter    = deepClone(DEFAULT_LETTER);
            if (!d.startDate) d.startDate = '2026-06-09T00:00:00';
            return d;
        }
    } catch (e) {}
    return {
        photos:    deepClone(DEFAULT_PHOTOS),
        timeline:  deepClone(DEFAULT_TIMELINE),
        letter:    deepClone(DEFAULT_LETTER),
        startDate: '2026-06-09T00:00:00'
    };
}

function saveMetadata() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appMeta));
        return true;
    } catch (e) {
        showToast('⚠️ Lưu thất bại — bộ nhớ đầy!', 'error');
        return false;
    }
}

/* ================================================
   MIGRATION — from old localStorage base64 format
   ================================================ */
function migrateOldData() {
    var oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldRaw) return Promise.resolve(false);

    var parsed;
    try { parsed = JSON.parse(oldRaw); } catch (e) { return Promise.resolve(false); }

    var nonDefaults = (parsed.photos || []).filter(function (p) {
        return !p.isDefault && p.src && p.src.indexOf('data:') === 0;
    });

    var promises = nonDefaults.map(function (photo) {
        return fetch(photo.src)
            .then(function (r) { return r.blob(); })
            .then(function (blob) { return storePhotoBlob(photo.id, blob); })
            .then(function () { delete photo.src; })
            .catch(function (err) { console.warn('Migration error for', photo.id, err); });
    });

    return Promise.all(promises).then(function () {
        /* Save migrated metadata under new key */
        var migrated = {
            photos:    parsed.photos    || deepClone(DEFAULT_PHOTOS),
            timeline:  parsed.timeline  || deepClone(DEFAULT_TIMELINE),
            letter:    parsed.letter    || deepClone(DEFAULT_LETTER),
            startDate: parsed.startDate || '2026-06-09T00:00:00'
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(OLD_STORAGE_KEY);
        console.info('[Album] Migrated from old storage format.');
        return true;
    });
}

/* ================================================
   INIT
   ================================================ */
function initData() {
    /* 1. Migrate old data if present */
    return migrateOldData().then(function () {
        /* 2. Load metadata */
        appMeta = loadMetadata();
        /* 3. Build object URLs for uploaded photos */
        return loadAllImageURLs();
    });
}
