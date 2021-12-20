let getElementByXPath = function(xpath) {
  return document.evaluate(
    xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
  ).singleNodeValue;
};

let doSetMaxBitrate = function() {
    window.dispatchEvent(new KeyboardEvent('keydown', {
        keyCode: 83,
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
    }));

    const VIDEO_SELECT = getElementByXPath("//div[text()='Video Bitrate']");
    const AUDIO_SELECT = getElementByXPath("//div[text()='Audio Bitrate']");
    const BUTTON = getElementByXPath("//button[text()='Override']");

    if (!VIDEO_SELECT || !AUDIO_SELECT || !BUTTON) {
        return false;
    }

    [VIDEO_SELECT, AUDIO_SELECT].forEach(function (el) {
        let parent = el.parentElement;

        let options = parent.querySelectorAll('select > option');
        if (options.length < 1) {
            return false;
        }

        for (var i = 0; i < options.length - 1; i++) {
            options[i].removeAttribute('selected');
        }

        options[options.length - 1].setAttribute('selected', 'selected');
    });

    BUTTON.click();

    return true;
};
