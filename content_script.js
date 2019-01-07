// From EME Logger extension

script_urls = [
    'https://cdn.rawgit.com/ricmoo/aes-js/master/index.js',
    'https://cdn.rawgit.com/Caligatio/jsSHA/master/src/sha.js'
]

urls = [
    'get_manifest.js'
]

// very messy workaround for accessing chrome storage outside of background / content scripts
chrome.storage.sync.get(['use6Channels'], function(items) {
    var use6Channels = items.use6Channels;
    var mainScript = document.createElement('script');
    mainScript.type = 'application/javascript';
    mainScript.text = 'var use6Channels = ' + use6Channels;
    document.documentElement.appendChild(mainScript);
});

for (var i = 0; i < script_urls.length; i++) {
    var script = document.createElement('script');
    script.src = script_urls[i];
    document.documentElement.appendChild(script);
}

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
