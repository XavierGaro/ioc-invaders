import {Sprite} from "./gameObjects.js";

let successCount = 0,
    errorCount = 0,
    currentTrack;

const queue = {
        images: [],
        sprites: [],
        sounds: [],
        music: []
    },
    cache = {
        images: {},
        sprites: {},
        sounds: {},
        music: {}
    },
    timeIntervals = {},
    subscribers = new Set();

export function subscribe(func) {
    subscribers.add(func);
}

function updateProgress() {
    for (const func of subscribers) {
        func(successCount + errorCount, queue.images.length);
    }
}

function generateSprites(gameContext) {
    let pool, poolSize;

    for (let i = 0; i < queue.sprites.length; i++) {

        pool = [];
        poolSize = 10;

        for (let j = 0; j < poolSize; j++) {
            pool.push(new Sprite(gameContext, {
                    image: getImage(queue.sprites[i].id),
                    numberOfFrames: queue.sprites[i].numberOfFrames,
                    ticksPerFrame: queue.sprites[i].ticksPerFrame,
                    loop: queue.sprites[i].loop === undefined ? true : queue.sprites[i].loop
                }
            ));
        }

        cache.sprites[queue.sprites[i].id] = pool;
    }
}

function generateSounds() {
    let pool, poolSize, sound;

    for (let i = 0; i < queue.sounds.length; i++) {
        pool = [];
        poolSize = 10; // nombre màxim de sons identics que es reprodueixen al mateix temps

        for (let j = 0; j < poolSize; j++) {
            sound = new Audio(queue.sounds[i].path);
            sound.volume = queue.sounds[i].volume;
            pool.push(sound);
        }

        cache.sounds[queue.sounds[i].id] = {
            currentSound: 0,
            pool: pool,
            volume: queue.sounds[i].volume,
        }
    }
}

function isDone() {
    return (queue.images.length === successCount + errorCount);
}

function _fadeOutAudio() {
    for (let id in cache.sounds) {
        for (let i = 0; i < cache.sounds[id].pool.length; i++) {
            let sound = cache.sounds[id].pool[i];
            sound.volume = 0;
        }
    }
}

function generateMusic() {
    for (let i = 0; i < queue.music.length; i++) {
        let sound = new Audio(queue.music[i].path);
        sound.volume = queue.music[i].volume;
        sound.loop = queue.music[i].loop;
        cache.music[queue.music[i].id] = sound;
    }
}

export function queueAsset(type, asset) {
    queue[type].push(asset);
}

export function downloadAll(callback, gameContext, args) {
    if (queue.images.length === 0) {
        callback();
    }

    for (let i = 0; i < queue.images.length; i++) {
        let path = queue.images[i].path,
            id = queue.images[i].id,
            img = new Image();

        img.addEventListener("load", function () {
            successCount += 1;
            updateProgress();
            if (isDone()) {
                generateSprites(gameContext);
                callback(args);
            }
        }, false);
        img.addEventListener("error", function () {
            errorCount += 1;
            updateProgress();
            if (isDone()) {
                generateSprites(gameContext);
                callback(args);
            }
        }, false);
        img.src = path;
        cache.images[id] = img;
    }

    generateSounds();
    generateMusic();
}

export function getImage(id) {
    return cache.images[id];
}

export function getSprite(id) {
    let pool = cache.sprites[id];
    let sprite = pool[pool.length - 1];
    pool.unshift(pool.pop());
    return sprite;
}

export function getSound(id) {
    let sounds = cache.sounds[id];

    if (sounds.pool[sounds.currentSound].currentTime === 0
        || sounds.pool[sounds.currentSound].ended) {
        sounds.pool[sounds.currentSound].play();
    }
    sounds.currentSound = (sounds.currentSound + 1) % sounds.pool.length;
}

export function fadeOutAudio(timeBeforeFadeOut) {
    clearIntervals();

    if (timeBeforeFadeOut) {
        timeIntervals.fadeOutAudio = setTimeout(fadeOutAudio, timeBeforeFadeOut);
    } else {
        _fadeOutAudio();
    }
}

export function fadeInAudio() {
    clearIntervals();

    for (let id in cache.sounds) {
        for (let i = 0; i < cache.sounds[id].pool.length; i++) {
            let sound = cache.sounds[id].pool[i];
            sound.volume = cache.sounds[id].volume;
        }
    }
}

function clearIntervals() {
    clearInterval(timeIntervals.fadeOutAudio);
}

export function getMusic(id) {
    resetMusic(currentTrack);
    cache.music[id].play();
    currentTrack = id;
}

export function resetMusic(id) {
    if (!id) {
        return;
    }

    if (!cache.music[id].ended) {
        cache.music[id].pause();
    }

    if (cache.music[id].currentTime > 0) {
        cache.music[id].currentTime = 0;
    }
}
