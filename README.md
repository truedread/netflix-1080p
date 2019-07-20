# netflix-1080p
Chrome extension to play Netflix in 1080p and 5.1

# How it works

The core of Netflix playback lies in JavaScript: specifically its "cadmium playercore" JS. The way Netflix (poorly) enforces 1080p to only be played back on ChromeOS devices is through these lines of JavaScript:

```javascript
a = /CrOS/.test(a.userAgent);
this.Fma = this.Aw = q.Gu.PV;
this.Qm = [x.$l.nV];
this.oo = [x.V.vA, x.V.wA];
a && this.oo.push(x.V.TH);
```

What it is doing is testing your User-agent for the "CrOS" string anywhere in it. If the search returns true, it appends the 1080p profile to the profile playback array (what this line `a && this.oo.push(x.V.TH);` is doing). If it returns false, it does nothing. The playback profile array is set up like so: `this.oo = [x.V.vA, x.V.wA];`, x.V.vA is the SD profile and x.V.wA is the 720p profile.

After reading this you think the easy solution would be to just change the User-agent to make it contain the string "CrOS" right? Not that simple. ChromeOS apparently has a different DRM implementation than chrome, even though both use Widevine. I could never get it to work when I tried, Netflix always threw license errors. The next easiest thing to do is just delete the conditional to append 1080p and just make the 1080p profile apart of the regular profiles (`this.oo = [x.V.vA, x.V.wA];` -> `this.oo = [x.V.vA, x.V.wA, x.V.TH];`). This works perfectly, but only for the majority of Netflix content. A few videos, like Disney movies, have manifests completely restricted to Edge to the point where you can't obtain them without an Edge ESN.

So, the next problem is how do you get an Edge manifest within Chrome? That's what I attempted to do with `get_manifest.js`, which is a Netflix MSL client written entirely in JavaScript (essentially my [pymsl](https://github.com/truedread/pymsl) library ported to JS). Of course there already an MSL client in JavaScript: the playercore. But since it's so heavily obfuscated, it was easier to rewrite one myself. The new mod has this snippet of code:

```javascript
var f = c.HS.viewables[0];
if (/watch/.test(window.location.pathname)) {
    var edgeLocked = true;

    for (var i = 0; i < f.videoTracks[0].downloadables.length; i++) {
        if (f.videoTracks[0].downloadables[i].contentProfile == "playready-h264mpl40-dash") {
            edgeLocked = false;
            break;
        }
    }

    if (edgeLocked) {
        console.log("Manifest locked to Edge (or not available in 1080p)");
        console.log("Getting Edge manifest");
        var manifest = await getManifest();
        console.log("Acquisition successful, commence playback");
        var edge_manifest = manifest.result.viewables[0];
        edge_manifest.playbackContextId = f.playbackContextId;
        edge_manifest.drmContextId = f.drmContextId;
        f = edge_manifest;
    }
}
```

What this new snippet of code does is test if the current page is a /watch/ URL, and if so check the Chrome manifest to see if a 1080p profile is already included. If so, commence playback like normal. If not, call `getManifest()` from `get_manifest.js` and replace the `playbackContextId` and `drmContextId` from the Edge manifest with values from the Chrome manifest. This is for license acquisition: those values are for the MSL server to maintain a persistent session between manifest acquisition and license acquisition. If you use an Edge `playbackContextId` and `drmContextId`, you'll be unable to obtain a Widevine license for Chrome. After all those operations are performed, playback is resumed like normal.

All the Chrome extension has to do is redirect all requests to Netflix's playercore to the modified one it has in the root directory. ~~That's it. A two line modification.~~ What was once a two line modification has turned into a giant project to cover all the bases in 1080p playback.

# Why?

Why not.

# Notes

- Chrome Webstore link: https://chrome.google.com/webstore/detail/netflix-1080p/cankofcoohmbhfpcemhmaaeennfbnmgp
- This may raise your CPU usage since Netflix was never intended to be played back in 1080p on Chrome. See [this](https://github.com/truedread/netflix-1080p/issues/15#issuecomment-398256248) comment for more details.
- Make sure to clear your browser cache, as the cached playercore will override the modified one and you will not be able to play 1080p.
- On videos where Edge manifest acquisition is needed (the console will say so), initial loading may take 5 seconds longer due to two manifests needing to be obtained.

# Donate

I'm still a student, so if you could help me out and buy me a cup of coffee it would support my future projects and development on this extension! Please note that donating is completely optional; this extension is free and will remain free forever.

- BTC: 1CqGMe6skpNQGSmm7uEtSrVfAUo59fYBnM
- ETH: 0x87053e321B3a4b94c6c38e6A062bF91649285452
- Ko-fi: https://ko-fi.com/truedread

Thanks!
