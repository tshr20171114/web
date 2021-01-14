// Copyright (c) 2019 Kichikuou <KichikuouChrome@gmail.com>
// This source code is governed by the MIT License, see the LICENSE file.
import { loadScript } from './util.js';
let timidity;
let gain;
let playing = false;
let fadeFinishTime = 0;
let stopTimer = null;
export function init(destNode) {
    Module.addRunDependency('timidity');
    loadScript('/timidity/timidity.js').then(() => {
        gain = destNode.context.createGain();
        gain.connect(destNode);
        timidity = new Timidity(gain, '/timidity/');
        timidity.on('playing', onPlaying);
        timidity.on('error', onError);
        timidity.on('ended', onEnd);
        Module.removeRunDependency('timidity');
    });
}
export function play(loop, data, datalen) {
    if (!timidity)
        return;
    timidity.load(Module.HEAPU8.slice(data, data + datalen));
    timidity.play();
    playing = true;
    // NOTE: `loop` is ignored.
}
export function stop() {
    if (!timidity)
        return;
    playing = false;
    timidity.pause();
}
export function pause() {
    if (!timidity)
        return;
    timidity.pause();
}
export function resume() {
    if (!timidity)
        return;
    timidity.play();
}
export function getPosition() {
    if (!timidity)
        return 0;
    return Math.round(timidity.currentTime * 1000);
}
export function setVolume(vol) {
    if (!timidity)
        return;
    gain.gain.value = vol / 100;
}
export function getVolume() {
    if (!timidity)
        return 100;
    return gain.gain.value * 100;
}
export function fadeStart(ms, vol, stopAfterFade) {
    if (!timidity)
        return;
    // Cancel previous fade
    gain.gain.cancelScheduledValues(gain.context.currentTime);
    if (stopTimer !== null) {
        clearTimeout(stopTimer);
        stopTimer = null;
    }
    // Resetting the volume while not playing?
    if (ms === 0 && vol === 100 && (stopTimer || !playing)) {
        // No worries, playback always starts with volume 100%
        return;
    }
    gain.gain.linearRampToValueAtTime(vol / 100, gain.context.currentTime + ms / 1000);
    fadeFinishTime = performance.now() + ms;
    if (stopAfterFade) {
        if (ms === 0)
            stop();
        else {
            stopTimer = setTimeout(() => {
                stop();
                stopTimer = null;
            }, ms);
        }
    }
}
export function isFading() {
    if (!timidity)
        return 0;
    return performance.now() < fadeFinishTime ? 1 : 0;
}
function onPlaying(playbackTime) {
    if (!playbackTime)
        return;
    // Reset volume to 100% at the start of playback
    gain.gain.setValueAtTime(1, playbackTime);
}
function onError() {
    console.log('onError');
}
function onEnd() {
    if (playing)
        timidity.play();
}
