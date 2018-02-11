chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        return {
            redirectUrl: chrome.extension.getURL("cadmium-playercore-5.0008.544.011-1080p.js")
        };
    }, {
        urls: [
            "*://assets.nflxext.com/en_us/ffe/player/html/*",
            "*://www.assets.nflxext.com/en_us/ffe/player/html/*"
        ]
    }, ["blocking"]
);