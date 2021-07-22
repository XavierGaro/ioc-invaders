const KEY_CODES = {
    32: 'Space',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown'
};

export let KEY_STATUS = {};

for (let code in KEY_CODES) {
    KEY_STATUS[KEY_CODES[code]] = false;
}

function getCode(event) {
    let code;

    if (event.code !== undefined) {
        code = event.code;
    } else if (event.keyIdentifier !== undefined) {
        code = event.keyIdentifier;
    } else if (event.keyCode !== undefined) {
        code = KEY_STATUS[event.keyCode];
    }

    return code;
}

document.onkeydown = function (e) {
    let code = getCode(e);

    if (code) {
        e.preventDefault();
        KEY_STATUS[code] = true;
    }
};

document.onkeyup = function (e) {

    let code = getCode(e);

    if (code) {
        e.preventDefault();
        KEY_STATUS[code] = false;
    }
};
