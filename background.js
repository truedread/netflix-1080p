chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        return {
            redirectUrl: chrome.extension.getURL("cadmium-playercore-6.0009.296.011-1080p.js")
        };
    }, {
        urls: [
            "*://assets.nflxext.com/*/ffe/player/html/*",
            "*://www.assets.nflxext.com/*/ffe/player/html/*"
        ]
    }, ["blocking"]
);
