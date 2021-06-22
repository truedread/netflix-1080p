// From EME Logger extension

urls = [
    'netflix_max_bitrate.js'
]

// very messy workaround for accessing chrome storage outside of background / content scripts
chrome.storage.sync.get(['use6Channels', 'setMaxBitrate', 'useVP9'], function(items) {
    var use6Channels = items.use6Channels;
    var setMaxBitrate = items.setMaxBitrate;
    var useVP9 = items.useVP9;
    var mainScript = document.createElement('script');
    mainScript.type = 'application/javascript';
    mainScript.text = 'var use6Channels = ' + use6Channels + ';' + '\n' 
	                + 'var setMaxBitrate = ' + setMaxBitrate + ';' + '\n'
                    + 'var useVP9 = ' + useVP9 + ';';
    document.documentElement.appendChild(mainScript);
});

for (var i = 0; i < urls.length; i++) {
    var mainScriptUrl = chrome.extension.getURL(urls[i]);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', mainScriptUrl, true);

    xhr.onload = function(e) {
        var xhr = e.target;
        var mainScript = document.createElement('script');
        mainScript.type = 'application/javascript';
        if (xhr.status == 200) {
            mainScript.text = xhr.responseText;
            document.documentElement.appendChild(mainScript);
        }
    };

  xhr.send();
}
