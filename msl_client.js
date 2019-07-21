function arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

function base64ToArrayBuffer(b64) {
    var byteString = atob(b64);
    var byteArray = new Uint8Array(byteString.length);
    for(var i=0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
    }

    return byteArray;
}

function arrayBufferToString(buffer){
    var arr = new Uint8Array(buffer);
    var str = String.fromCharCode.apply(String, arr);
    if(/[\u0080-\uffff]/.test(str)){
        throw new Error("this string seems to contain (still encoded) multibytes");
    }

    return str;
}

function padBase64(b64) {
    var l = b64.length % 4;
    if (l == 2) {
        b64 += "==";
    } else if (l == 3) {
        b64 += "=";
    }

    return b64.replace(/-/g, "+").replace(/_/g, "/");
}

function generateEsn() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 30; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

var manifestUrl = "https://www.netflix.com/nq/msl_v1/cadmium/pbo_manifests/^1.0.0/router";
var licenseUrl = "https://www.netflix.com/nq/msl_v1/cadmium/pbo_licenses/^1.0.0/router";
var shaktiMetadataUrl = "https://www.netflix.com/api/shakti/d7cab521/metadata?movieid=";
var defaultEsn = "NFCDIE-04-" + generateEsn();
var profiles = [
    "playready-h264mpl30-dash",
    "playready-h264mpl31-dash",
    "playready-h264mpl40-dash",
    "heaac-2-dash",
    "simplesdh",
    "nflx-cmisc",
    "BIF240",
    "BIF320"
];


if(use6Channels)
    profiles.push("heaac-5.1-dash");

var messageid = Math.floor(Math.random() * 2**52);
var header = {
    "sender": defaultEsn,
    "renewable": true,
    "capabilities": {
        "languages": ["en-US"],
        "compressionalgos": [""]
    },
    "messageid": messageid,
};

async function getViewableId(viewableIdPath) {
    console.log("Getting video metadata for ID " + viewableIdPath);

    var apiResp = await fetch(
        shaktiMetadataUrl + viewableIdPath,
        {
            credentials: "same-origin",
            method: "GET"
        }
    );

    var apiJson = await apiResp.json();
    console.log("Metadata response:");
    console.log(apiJson);

    var viewableId = apiJson.video.currentEpisode;
    if (!viewableId) {
        viewableId = parseInt(viewableIdPath);
    }

    return viewableId;
}

async function performKeyExchange() {
    delete header.userauthdata;
    var keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {name: "SHA-1"},
        },
        false,
        ["encrypt", "decrypt"]
    );

    var publicKey = await window.crypto.subtle.exportKey(
        "spki",
        keyPair.publicKey
    );

    header.keyrequestdata = [
        {
            "scheme": "ASYMMETRIC_WRAPPED",
            "keydata": {
                "publickey": arrayBufferToBase64(publicKey),
                "mechanism": "JWK_RSA",
                "keypairid": "rsaKeypairId"
            }
        }
    ];

    var headerenvelope = {
        "entityauthdata": {
            "scheme": "NONE",
            "authdata": {
                "identity": defaultEsn,
            }
        },
        "signature": "",
    };

    headerenvelope.headerdata = btoa(JSON.stringify(header));

    var payload = {
        "signature": ""
    };

    payload.payload = btoa(JSON.stringify({
        "sequencenumber": 1,
        "messageid": messageid,
        "endofmsg": true,
        "data": ""
    }));

    var request = JSON.stringify(headerenvelope) + JSON.stringify(payload);

    var handshakeResp = await fetch(
        manifestUrl,
        {
            body: request,
            method: "POST"
        }
    );

    var handshakeJson = await handshakeResp.json();
    if (!handshakeJson.headerdata) {
        console.error(JSON.parse(atob(handshakeJson.errordata)));
        throw("Error parsing key exchange response");
    }

    var headerdata = JSON.parse(atob(handshakeJson.headerdata));
    var encryptionKeyData = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        keyPair.privateKey,
        base64ToArrayBuffer(headerdata.keyresponsedata.keydata.encryptionkey)
    );

    encryptionKeyData = JSON.parse(arrayBufferToString(encryptionKeyData));

    var signKeyData = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        keyPair.privateKey,
        base64ToArrayBuffer(headerdata.keyresponsedata.keydata.hmackey)
    );

    signKeyData = JSON.parse(arrayBufferToString(signKeyData));

    return {
        "headerdata": headerdata,
        "encryptionKeyData": encryptionKeyData,
        "signKeyData": signKeyData
    };
}

async function generateMslRequestData(data) {
    var iv = window.crypto.getRandomValues(new Uint8Array(16));
    var aesCbc = new aesjs.ModeOfOperation.cbc(
        base64ToArrayBuffer(padBase64(encryptionKeyData.k)),
        iv
    );

    var textBytes = aesjs.utils.utf8.toBytes(JSON.stringify(header));
    var encrypted = aesCbc.encrypt(aesjs.padding.pkcs7.pad(textBytes));
    var encryptionEnvelope = {
        "keyid": defaultEsn + "_" + sequenceNumber,
        "sha256": "AA==",
        "iv": arrayBufferToBase64(iv),
        "ciphertext": arrayBufferToBase64(encrypted)
    };

    var shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.setHMACKey(padBase64(signKeyData.k), "B64");
    shaObj.update(JSON.stringify(encryptionEnvelope));
    var signature = shaObj.getHMAC("B64");
    var encryptedHeader = {
        "signature": signature,
        "mastertoken": mastertoken
    };
    
    encryptedHeader.headerdata = btoa(JSON.stringify(encryptionEnvelope));
    
    var firstPayload = {
        "messageid": messageid,
        "data": btoa(JSON.stringify(data)),
        "sequencenumber": 1,
        "endofmsg": true
    };

    iv = window.crypto.getRandomValues(new Uint8Array(16));
    aesCbc = new aesjs.ModeOfOperation.cbc(
        base64ToArrayBuffer(padBase64(encryptionKeyData.k)),
        iv
    );
    
    textBytes = aesjs.utils.utf8.toBytes(JSON.stringify(firstPayload));
    encrypted = aesCbc.encrypt(aesjs.padding.pkcs7.pad(textBytes));    
    
    encryptionEnvelope = {
        "keyid": defaultEsn + "_" + sequenceNumber,
        "sha256": "AA==",
        "iv": arrayBufferToBase64(iv),
        "ciphertext": arrayBufferToBase64(encrypted)
    };

    shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.setHMACKey(padBase64(signKeyData.k), "B64");
    shaObj.update(JSON.stringify(encryptionEnvelope));
    signature = shaObj.getHMAC("B64");

    var firstPayloadChunk = {
        "signature": signature,
        "payload": btoa(JSON.stringify(encryptionEnvelope))
    };

    return JSON.stringify(encryptedHeader) + JSON.stringify(firstPayloadChunk);
}

async function decryptMslResponse(data) {
    try {
        JSON.parse(data);
        console.error(JSON.parse(atob(JSON.parse(data).errordata)));
        throw("Error parsing data");
    } catch (e) {}

    var pattern = /,"signature":"[0-9A-Za-z/+=]+"}/;
    var payloadsSplit = data.split("}}")[1].split(pattern);
    payloadsSplit.pop();
    var payloadChunks = [];
    for (var i = 0; i < payloadsSplit.length; i++) {
        payloadChunks.push(payloadsSplit[i] + "}");
    }

    var chunks = "";
    for (i = 0; i < payloadChunks.length; i++) {
        var payloadchunk = JSON.parse(payloadChunks[i]);
        encryptionEnvelope = atob(payloadchunk.payload);
        aesCbc = new aesjs.ModeOfOperation.cbc(
            base64ToArrayBuffer(padBase64(encryptionKeyData.k)),
            base64ToArrayBuffer(JSON.parse(encryptionEnvelope).iv)
        );

        var ciphertext = base64ToArrayBuffer(
            JSON.parse(encryptionEnvelope).ciphertext
        );

        var plaintext = JSON.parse(
            arrayBufferToString(
                aesjs.padding.pkcs7.strip(
                    aesCbc.decrypt(ciphertext)
                )
            )
        );

        chunks += atob(plaintext.data);
    }

    var decrypted = JSON.parse(chunks);

    if (!decrypted.result) {
        console.error(decrypted);
        throw("Error parsing decrypted data");
    }

    return decrypted.result;
}

async function getManifest(esn=defaultEsn) {
    defaultEsn = esn;
    console.log("Performing key exchange");
    keyExchangeData = await performKeyExchange();
    console.log("Key exchange data:");
    console.log(keyExchangeData);

    headerdata = keyExchangeData.headerdata;
    encryptionKeyData = keyExchangeData.encryptionKeyData;
    signKeyData = keyExchangeData.signKeyData;
    mastertoken = headerdata.keyresponsedata.mastertoken;
    sequenceNumber = JSON.parse(atob(mastertoken.tokendata)).sequencenumber;
    viewableIdPath = window.location.pathname.substring(7, 15);
    viewableId = await getViewableId(viewableIdPath);

    localeId = "en-US";
    try {
        localeId = netflix.appContext.state.model.models.memberContext.data.geo.locale.id;
    } catch (e) {}

    var manifestRequestData = {
        "version": 2,
        "url": "/manifest",
        "id": Date.now(),
        "esn": defaultEsn,
        "languages": [localeId],
        "uiVersion": "shakti-v4bf615c3",
        "clientVersion": "6.0015.328.011",
        "params": {
            "type": "standard",
            "viewableId": viewableId,
            "profiles": profiles,
            "flavor": "STANDARD",
            "drmType": "widevine",
            "drmVersion": 25,
            "usePsshBox": true,
            "isBranching": false,
            "useHttpsStreams": true,
            "imageSubtitleHeight": 720,
            "uiVersion": "shakti-v4bf615c3",
            "clientVersion": "6.0015.328.011",
            "supportsPreReleasePin": true,
            "supportsWatermark": true,
            "showAllSubDubTracks": false,
            "videoOutputInfo": [
                {
                    "type": "DigitalVideoOutputDescriptor",
                    "outputType": "unknown",
                    "supportedHdcpVersions": ['1.4'],
                    "isHdcpEngaged": true
                }
            ],
            "preferAssistiveAudio": false,
            "isNonMember": false
        }
    };

    header.userauthdata = {
        "scheme": "NETFLIXID",
        "authdata": {}
    };

    var encryptedManifestRequest = await generateMslRequestData(manifestRequestData);

    var manifestResp = await fetch(
        manifestUrl,
        {
            body: encryptedManifestRequest,
            credentials: "same-origin",
            method: "POST",
            headers: {"Content-Type": "application/json"}
        }
    );

    manifestResp = await manifestResp.text();
    var manifest = await decryptMslResponse(manifestResp);

    console.log("Manifest:");
    console.log(manifest);

    licensePath = manifest.links.license.href;

    return manifest;
}

async function getLicense(challenge, sessionId) {
    licenseRequestData = {
        "version": 2,
        "url": licensePath,
        "id": Date.now(),
        "esn": defaultEsn,
        "languages": [localeId],
        "uiVersion": "shakti-v4bf615c3",
        "clientVersion": "6.0015.328.011",
        "params": [{
            "sessionId": sessionId,
            "clientTime": Math.floor(Date.now() / 1000),
            "challengeBase64": challenge,
            "xid": Math.floor((Math.floor(Date.now() / 1000) + 0.1612) * 1000)
        }],
        "echo": "sessionId"
    };

    var encryptedLicenseRequest = await generateMslRequestData(licenseRequestData);
    var licenseResp = await fetch(
        licenseUrl,
        {
            body: encryptedLicenseRequest,
            credentials: "same-origin",
            method: "POST",
            headers: {"Content-Type": "application/json"}
        }
    );

    licenseResp = await licenseResp.text();
    var license = await decryptMslResponse(licenseResp);

    console.log("License:");
    console.log(license);

    return license;
}
