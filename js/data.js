/* ================================================
   DATA.JS — Hybrid Data Layer: Cloud Sync (Firebase) + IndexedDB + localStorage
   ================================================
   Depends on: utils.js, firebase-config.js
   ================================================ */

/* ---------- State ---------- */
var appMeta      = null;   // { photos, timeline, letter, startDate }
var objectURLMap = {};     // id → objectURL (for local uploaded photos)
var _db          = null;   // cached IDB connection

/* ================================================
   INDEXEDDB — Local photo blob storage
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
            var tx = db.transaction(PHOTO_STORE, 'readwrite');
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
   OBJECT / CLOUD URL RESOLVER
   ================================================ */
function getPhotoSrc(photo) {
    if (photo.isDefault) return photo.src;
    /* If cloud URL exists, use it directly (accessible on any device) */
    if (photo.cloudUrl) return photo.cloudUrl;
    /* Fallback to local object URL */
    return objectURLMap[photo.id] || '';
}

function revokeURL(id) {
    if (objectURLMap[id]) {
        URL.revokeObjectURL(objectURLMap[id]);
        delete objectURLMap[id];
    }
}

function loadAllImageURLs() {
    var nonDefaults = appMeta.photos.filter(function (p) { return !p.isDefault && !p.cloudUrl; });
    var promises = nonDefaults.map(function (p) {
        return getPhotoBlob(p.id).then(function (blob) {
            if (blob) {
                revokeURL(p.id);
                objectURLMap[p.id] = URL.createObjectURL(blob);
            }
        }).catch(function (err) {
            console.warn('Could not load local image', p.id, err);
        });
    });
    return Promise.all(promises);
}

/* ================================================
   LOCALSTORAGE & CLOUD SAVE
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
        /* Local save */
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appMeta));

        /* Sync to Firebase Firestore if connected */
        if (isFirebaseActive && dbFirestore) {
            dbFirestore.collection('album').doc('metadata').set(appMeta)
                .then(function() {
                    console.info('[Firebase] Synced metadata to cloud successfully.');
                })
                .catch(function(e) {
                    console.warn('[Firebase] Sync failed:', e);
                });
        }
        return true;
    } catch (e) {
        showToast('⚠️ Lưu thất bại — bộ nhớ đầy!', 'error');
        return false;
    }
}

/* ================================================
   FIREBASE CLOUD PHOTO UPLOAD
   ================================================ */
function uploadPhotoToCloud(id, blob) {
    if (!isFirebaseActive || !storageRef) {
        return Promise.resolve(null);
    }
    var ref = storageRef.child('photos/' + id + '.jpg');
    return ref.put(blob).then(function (snapshot) {
        return snapshot.ref.getDownloadURL();
    });
}

/* ================================================
   EXPORT / IMPORT BACKUP
   ================================================ */
function exportDataJSON() {
    var exportObj = {
        version: 1,
        exportedAt: new Date().toISOString(),
        meta: appMeta,
        blobs: {}
    };

    var nonDefaults = appMeta.photos.filter(function (p) { return !p.isDefault && !p.cloudUrl; });
    var promises = nonDefaults.map(function (p) {
        return getPhotoBlob(p.id).then(function (blob) {
            if (blob) {
                return new Promise(function (res) {
                    var r = new FileReader();
                    r.onload = function (e) {
                        exportObj.blobs[p.id] = e.target.result;
                        res();
                    };
                    r.readAsDataURL(blob);
                });
            }
        });
    });

    Promise.all(promises).then(function () {
        var str = JSON.stringify(exportObj);
        var blob = new Blob([str], { type: 'application/json' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href   = url;
        a.download = 'ky-niem-tinh-yeu-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📦 Đã xuất file sao lưu thành công!', 'success');
    }).catch(function (err) {
        showToast('⚠️ Lỗi khi xuất dữ liệu: ' + err.message, 'error');
    });
}

function importDataJSON(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);
            if (!data.meta || !data.meta.photos) {
                showToast('⚠️ File dữ liệu không hợp lệ!', 'error');
                return;
            }

            appMeta = data.meta;
            saveMetadata();

            var blobKeys = Object.keys(data.blobs || {});
            var restorePromises = blobKeys.map(function (id) {
                return fetch(data.blobs[id])
                    .then(function (r) { return r.blob(); })
                    .then(function (b) { return storePhotoBlob(id, b); });
            });

            Promise.all(restorePromises).then(function () {
                return loadAllImageURLs();
            }).then(function () {
                renderAll();
                showToast('🎉 Đã nhập dữ liệu đồng bộ thành công!', 'success');
            });
        } catch (err) {
            showToast('⚠️ Lỗi khi đọc file backup: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

/* ================================================
   MIGRATION FROM OLD BASE64 FORMAT
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
   INIT DATA & REALTIME CLOUD LISTENER
   ================================================ */
function initData() {
    return initFirebaseCloud().then(function () {
        return migrateOldData();
    }).then(function () {
        appMeta = loadMetadata();
        return loadAllImageURLs();
    }).then(function () {
        /* Real-time synchronization via Firebase Firestore */
        if (isFirebaseActive && dbFirestore) {
            dbFirestore.collection('album').doc('metadata')
                .onSnapshot(function (doc) {
                    if (doc.exists) {
                        var cloudData = doc.data();
                        if (cloudData && cloudData.photos) {
                            appMeta = cloudData;
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(appMeta));
                            loadAllImageURLs().then(function () {
                                renderAll();
                                console.info('[Firebase] Realtime update synced from cloud.');
                            });
                        }
                    }
                }, function (err) {
                    console.warn('[Firebase] Realtime listener error:', err.message);
                });
        }
    });
}
