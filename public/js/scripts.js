window.confirmDelete = function (form, message) {
    let overlay = document.getElementById('zora-delete-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'zora-delete-modal';
        overlay.className = 'zora-modal-overlay';
        overlay.innerHTML = `
            <div class="zora-modal">
                <h2>ARCHIVE REMOVAL</h2>
                <p id="zora-modal-msg"></p>
                <div class="modal-actions">
                    <button id="modal-cancel" class="btn-black" style="padding: 1rem 2rem;">CANCEL</button>
                    <button id="modal-confirm" class="btn-orange" style="padding: 1rem 2rem;">DELETE</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    document.getElementById('zora-modal-msg').innerText = message || "Are you sure you want to permanently remove this narrative from the archive?";
    overlay.style.display = 'flex';

    document.getElementById('modal-cancel').onclick = () => {
        overlay.style.display = 'none';
    };

    document.getElementById('modal-confirm').onclick = () => {
        overlay.style.display = 'none';
        form.submit();
    };

    return false;
};
