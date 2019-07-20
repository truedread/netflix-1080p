function save_options() {
    var use6Channels = document.getElementById('5.1').checked;
    chrome.storage.sync.set({
        use6Channels: use6Channels
    }, function() {
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

function restore_options() {
    chrome.storage.sync.get({
        use6Channels: false
    }, function(items) {
        document.getElementById('5.1').checked = items.use6Channels;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);