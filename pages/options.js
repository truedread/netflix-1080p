function save_options() {
    var use6Channels = document.getElementById('5.1').checked;
    var setMaxBitrate = document.getElementById('setMaxBitrate').checked;
    var useVP9 = document.getElementById('useVP9').checked;
    chrome.storage.sync.set({
        use6Channels: use6Channels,
        setMaxBitrate: setMaxBitrate,
        useVP9: useVP9
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
        setMaxBitrate: false,
        useVP9: false
    }, function(items) {
        document.getElementById('5.1').checked = items.use6Channels;
        document.getElementById('setMaxBitrate').checked = items.setMaxBitrate;
        document.getElementById('useVP9').checked = items.useVP9;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);