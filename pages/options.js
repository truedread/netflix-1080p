function save_options() {
    var use6Channels = document.getElementById('5.1').checked;
    var setMaxBitrate = document.getElementById('setMaxBitrate').checked;
    chrome.storage.sync.set({
        use6Channels: use6Channels,
        setMaxBitrate: setMaxBitrate
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
        use6Channels: false,
        setMaxBitrate: false
    }, function(items) {
        document.getElementById('5.1').checked = items.use6Channels;
        document.getElementById('setMaxBitrate').checked = items.setMaxBitrate;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);