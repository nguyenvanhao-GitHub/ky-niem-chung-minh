/* ================================================
   UTILS.JS — Shared constants, helpers, defaults
   ================================================ */

/* ---------- Storage Keys ---------- */
var STORAGE_KEY    = 'kyniemalbum_meta_v1';
var OLD_STORAGE_KEY = 'kyniemalbum_v3';   // for migration
var DB_NAME        = 'kyniemalbum_db';
var DB_VERSION     = 1;
var PHOTO_STORE    = 'photos';

/* ---------- Default Data ---------- */
var DEFAULT_PHOTOS = [
    { id: 'p1', src: 'PNT00120260624135008_01.jpg', albumCaption: 'Khoảnh khắc ngọt ngào 💕',           isDefault: true },
    { id: 'p2', src: 'PNT00120260624135008_02.jpg', albumCaption: 'Nụ cười của em 🌸',                  isDefault: true },
    { id: 'p3', src: 'PNT00120260624135008_03.jpg', albumCaption: 'Bên nhau mãi nhé ✨',                isDefault: true },
    { id: 'p4', src: 'PNT00120260624135008_04.jpg', albumCaption: 'Tình yêu của chúng mình 💖',         isDefault: true },
    { id: 'p5', src: 'PNT00120260624135008_05.jpg', albumCaption: 'Hạnh phúc là đây 🥰',               isDefault: true },
    { id: 'p6', src: 'PNT00120260624135008_06.jpg', albumCaption: 'Ngày tháng bên em 🌷',              isDefault: true },
    { id: 'p7', src: 'PNT00120260624135008_07.jpg', albumCaption: 'Yêu em nhiều lắm 💗',               isDefault: true },
    { id: 'p8', src: 'PNT00120260624135008_08.jpg', albumCaption: 'Mãi bên nhau em nhé 💞',            isDefault: true },
    { id: 'p9', src: 'PNT00120260624135008_09.jpg', albumCaption: 'Và còn rất nhiều kỷ niệm nữa... 🌟', isDefault: true }
];

var DEFAULT_TIMELINE = [
    { id: 't1', icon: '💬', date: '14 / 06 / 2026', event: 'Lần đầu nhắn tin làm quen',  desc: 'Một tin nhắn nhỏ — mở đầu cho câu chuyện lớn nhất cuộc đời anh. Cảm ơn em đã trả lời...' },
    { id: 't2', icon: '☕', date: '16 / 06 / 2026', event: 'First Date 💕',               desc: 'Lần đầu tiên được gặp em — tim anh đập loạn cả buổi, không biết em có để ý không...' },
    { id: 't3', icon: '🌸', date: '17 / 06 / 2026', event: 'Second Date 🥰',              desc: 'Một ngày nữa bên em — anh biết mình đã thích em rồi, chỉ chưa dám nói thôi...' },
    { id: 't4', icon: '🌟', date: '20 / 06 / 2026', event: 'Third Date ✨',               desc: 'Lần thứ ba gặp nhau — anh biết từ đây em là người anh muốn ở bên mãi mãi.' },
    { id: 't5', icon: '💖', date: 'Và còn rất nhiều ngày nữa...', event: 'Anh yêu em ❤️', desc: 'Từ đó đến giờ, mỗi ngày bên em đều là một trang mới trong cuốn album tình yêu này. Anh yêu em — hôm nay, ngày mai và mãi mãi.' }
];

var DEFAULT_LETTER = {
    greeting: 'Em yêu của anh,',
    body:     'Anh không biết phải bắt đầu từ đâu, vì mỗi khi nghĩ về em, trái tim anh lại tràn ngập những cảm xúc ấm áp nhất.\n\nCảm ơn em đã đến bên anh, đã mang theo nụ cười và ánh sáng lấp đầy cuộc sống của anh. Mỗi ngày bên em là một ngày đặc biệt, mỗi khoảnh khắc bên em là một kỷ niệm anh muốn giữ mãi.\n\nCuốn album nhỏ này — anh làm để em biết rằng, từng khoảnh khắc bên em, anh đều trân trọng. Từng nụ cười, từng ánh mắt, từng giây phút đời thường... tất cả đều là kho báu của anh.\n\nAnh hứa sẽ luôn ở bên em, viết tiếp từng trang mới trong cuốn album tình yêu này. Yêu em nhiều lắm! 💕',
    signature: 'Mãi yêu em,\nAnh của em ❤️'
};

/* ---------- Helpers ---------- */
function genId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/* ---------- Toast ---------- */
function showToast(msg, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.4s';
        setTimeout(function () { toast.remove(); }, 400);
    }, 2800);
}

/* ---------- Image compression → Blob ---------- */
function compressToBlob(file, maxDim, quality) {
    maxDim   = maxDim   || 1400;
    quality  = quality  || 0.82;
    return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var w = img.width, h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                    else       { w = Math.round(w * maxDim / h); h = maxDim; }
                }
                var canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
