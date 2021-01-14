// Copyright (c) 2017 Kichikuou <KichikuouChrome@gmail.com>
// This source code is governed by the MIT License, see the LICENSE file.
import {$} from './util.js';
import {config} from './config.js';
import {SaveDataManager} from './savedata.js';
import {openFileInput} from './widgets.js';

// Settings Dialog

const antialias = <HTMLInputElement>$('#antialias');
const synthSelect = <HTMLInputElement>$('#synthesizer');
const unloadConfirmation = <HTMLInputElement>$('#unload-confirmation');
const messageSkipFlags: { [id: string]: number } = {
    '#msgskip-skip-unseen': 1,
    '#msgskip-stop-on-unseen': 2,
    '#msgskip-stop-on-menu': 4,
    '#msgskip-stop-on-click': 8,
};
let saveDataManager: SaveDataManager | null = null;
let keyDownHandler: (ev: KeyboardEvent) => void;

function init() {
    $('#settings-button').addEventListener('click', openModal);
    $('#settings-close').addEventListener('click', closeModal);
    keyDownHandler = (ev: KeyboardEvent) => {
        if (ev.keyCode === 27)  // escape
            closeModal();
    };
    $('#settings-overlay').addEventListener('click', closeModal);

    antialias.addEventListener('change', antialiasChanged);
    antialias.checked = config.antialias;
    unloadConfirmation.addEventListener('change', unloadConfirmationChanged);
    unloadConfirmation.checked = config.unloadConfirmation;
    synthSelect.addEventListener('change', synthSelectChanged);
    synthSelect.value = config.synthesizer;
    for (const id in messageSkipFlags) {
        const e = $(id) as HTMLInputElement;
        e.addEventListener('change', messageSkipFlagChanged);
        e.checked = !!(config.messageSkipFlags & messageSkipFlags[id]);
    }
    $('#msgskip-stop-on-unseen').toggleAttribute(
        'disabled', ($('#msgskip-skip-unseen') as HTMLInputElement).checked);

    $('#downloadSaveData').addEventListener('click', downloadSaveData);
    $('#uploadSaveData').addEventListener('click', uploadSaveData);

    document.addEventListener('gamestart', onGameStart);
}

function onGameStart() {
    messageSkipFlagChanged();  // set the initial values
}

function openModal() {
    $('#settings-modal').classList.add('active');
    document.addEventListener('keydown', keyDownHandler);
    saveDataManager = new SaveDataManager();
    checkSaveData();
}

function closeModal() {
    $('#settings-modal').classList.remove('active');
    document.removeEventListener('keydown', keyDownHandler);
    saveDataManager = null;
}

function antialiasChanged() {
    config.antialias = antialias.checked;
    config.persist();
    if (!$('#xsystem35').hidden)
        _ags_setAntialiasedStringMode(config.antialias ? 1 : 0);
}

function unloadConfirmationChanged() {
    config.unloadConfirmation = unloadConfirmation.checked;
    config.persist();
}

function messageSkipFlagChanged() {
    let flags = 0;
    for (const id in messageSkipFlags) {
        if (($(id) as HTMLInputElement).checked)
            flags |= messageSkipFlags[id];
    }
    $('#msgskip-stop-on-unseen').toggleAttribute(
        'disabled', ($('#msgskip-skip-unseen') as HTMLInputElement).checked);
    if ((window as any)['_msgskip_setFlags'])
        _msgskip_setFlags(flags, 0xffffffff);
    config.messageSkipFlags = flags;
    config.persist();
}

function synthSelectChanged() {
    let value = synthSelect.value;
    if (value != 'fm' && value != 'midi')
        throw `Unexpected synth select value "${value}"`;
    config.synthesizer = value;
    config.persist();
    if (!$('#xsystem35').hidden)
        _select_synthesizer(value === 'fm' ? 1 : 0);
}

export function disableSynthSelect() {
    synthSelect.value = 'midi';
    synthSelect.setAttribute('disabled', '');
}

async function checkSaveData() {
    if ($('#downloadSaveData').hasAttribute('disabled') &&
        await saveDataManager!.hasSaveData())
        $('#downloadSaveData').removeAttribute('disabled');
}

async function downloadSaveData() {
    saveDataManager!.download();
}

function uploadSaveData() {
    openFileInput().then((file) =>
        saveDataManager!.extract(file)).then(() =>
        checkSaveData());
}

init();
