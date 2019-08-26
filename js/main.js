let maxImages = 300;
let currentImages = 0;

let socket = undefined;

let colCount = 6;
let cols = [];
let colHeights = [];

let loadNsfw = false;

let storage = window.localStorage;

window.onload = function () {
    setDefaultPresets();
    updatePresets();

    const storageColCount = storage.getItem("col-count");
    if (storageColCount) {
        document.getElementById("col-count").value = storageColCount;
        colCount = storageColCount;
    }

    const storageMaxImages = storage.getItem("max-images");
    if (storageMaxImages) {
        document.getElementById("max-images").value = storageMaxImages;
        maxImages = storageMaxImages;
    }

    if (storage.getItem("nsfw") === "true") {
        document.getElementById("nsfw").checked = true;
        loadNsfw = true;
    }
};

function resetGallery() {
    let out = document.getElementById("output");
    while (out.hasChildNodes()) {
        out.removeChild(out.lastChild);
    }
    cols = [];
    colHeights = [];
    currentImages = 0;
    document.getElementById("output").appendChild(createGallery(colCount));
}

function onConnectClick() {

    if (socket) {
        socket.close()
    }

    document.getElementById("status").innerHTML = "Connecting...";
    document.getElementById("status").style = "color: orange";

    resetGallery();

    let topics = document.getElementById("topics").value
        .toLowerCase()
        .split(/[\s,]+/ig)
        .filter(topic => topic !== "");

    if (topics.length === 0) {
        alert("You must specify at least one topic");
        return
    }

    connect(topics);
}

function connect(topics) {

    socket = new WebSocket("ws://localhost:3090/socket");

    socket.onmessage = msg => {
        let j = JSON.parse(msg.data);

        if (j.urls && ((loadNsfw && j.over_18) || !j.over_18)) {
            j.urls
                .filter(url => /http?s:\/\/.*(.jpg|.jpeg|.bmp|.png|.gif|.jpeg:orig|.jpg:orig)$/.test(url))
                .forEach(url => appendToGallery(createImage(url)));
        }
    };

    socket.onopen = () => {
        socket.send(JSON.stringify({
            exchange: "reddit",
            topics: topics
        }));

        document.getElementById("status").innerHTML = "Connected";
        document.getElementById("status").style = "color: green";
    };

    socket.onclose = () => {
        document.getElementById("status").innerHTML = "Disconnected";
        document.getElementById("status").style = "color: red";
    };

    socket.onerror = (e) => {
        document.getElementById("status").innerHTML = "Websocket error";
        document.getElementById("status").style = "color: orange";
        console.log(e)
    };

    window.onbeforeunload = function () {
        socket.close();
    }
}

function createImage(src) {
    const img = document.createElement("img");
    img.setAttribute("class", "img");
    img.setAttribute("src", src);

    img.onerror = function () {
        //Don't display broken images
        img.remove();
        return true;
    };

    return img;
}

function createGallery(count) {

    const gallery = document.createElement('div');
    gallery.setAttribute('class', 'row');

    for (let i = 0; i < count; i++) {
        let col = document.createElement('div');
        col.setAttribute('class', `col s${Math.floor(12 / count)}`);
        gallery.appendChild(col);
        cols.push(col);
        colHeights.push(0);
    }

    return gallery;
}

function popRow() {
    for (let i = 0; i < colCount; i++) {
        if (cols[i].hasChildNodes()) {
            colHeights[i] -= cols[i].firstChild.height;
            cols[i].firstChild.remove();
            currentImages -= 1;
        }
    }
}

function appendToGallery(child) {

    currentImages++;

    if (currentImages > maxImages) {
        popRow()
    }

    let minHeight = Number.MAX_VALUE;
    let min = 0;

    for (let i = 0; i < cols.length; i++) {
        if (colHeights[i] < minHeight) {
            minHeight = colHeights[i];
            min = i;
        }
    }

    cols[min].appendChild(child);
    if (!child.height) {
        colHeights[min] += 2400 / colCount;
        child.onload = function () {
            colHeights[min] += this.height;
            colHeights[min] -= 2400 / colCount;
        };
    } else {
        colHeights[min] += child.height;
    }
}

function getPreset(name) {
    let j = JSON.parse(storage.getItem("presets"));
    return j[name]
}

function setPreset(name, topics) {
    if (storage.getItem("presets") === null) {
        storage.setItem("presets", "{}")
    }

    let j = JSON.parse(storage.getItem("presets"));
    j[name] = topics;
    storage.setItem("presets", JSON.stringify(j))
}

function setDefaultPresets() {
    setPreset("Reddit animals", "*.aww, *.awww, *.cats, *.eyebleach, *.cute, *.dogs, " +
        "*.koalas, *.lynxes, comment.dogs, *.dogpictures, submission.puppies, submission.puppy, " +
        "submission.doge");
    setPreset("Reddit birds", "submission.birds, submission.bird, submission.parrots, " +
        "submission.birdpics, submission.birdwatching, submission.birding, submission.birdphotography");
    setPreset("Reddit ocean", "*.ocean, *.oceangifs, *.swimming, " +
        "*.algae, *.costalforaging, *.earthscience, *.freediving, " +
        "*.hydrology *.lifeaquatic, *.marinelife, *.octopuses, " +
        "*.scuba, *.seacreatureporn, *.seaweed, *.sharks, " +
        "*.shipwrecks, *.water, *.whales, *.underwaterphotography");
}

function onPresetSelect() {
    let selection = document.getElementById("presets").value;
    document.getElementById("topics").value = getPreset(selection);
}

function onSavePresetClick() {
    let name = document.getElementById("preset-name").value;
    let topics = document.getElementById("topics").value;

    if (name === "") {
        alert("Invalid preset name!")
    }

    setPreset(name, topics);
    updatePresets();
}

function updatePresets() {
    let j = JSON.parse(storage.getItem("presets"));
    const select = document.getElementById("presets");

    while (select.hasChildNodes()) {
        select.removeChild(select.lastChild);
    }

    const opt = document.createElement("option");
    opt.setAttribute("disabled", "");
    opt.setAttribute("value", "-");
    opt.appendChild(document.createTextNode("Load Preset"));
    select.appendChild(opt);

    Object.keys(j).forEach(key => {
        const opt = document.createElement("option");
        opt.setAttribute("value", key);
        opt.appendChild(document.createTextNode(key));
        select.appendChild(opt)
    });

    select.value = "-"
}

function onMaxImageChange() {
    maxImages = document.getElementById("max-images").value;
    storage.setItem("max-images", maxImages);
}

function onNsfwChange() {
    loadNsfw = document.getElementById("nsfw").checked;
    storage.setItem("nsfw", loadNsfw);
}

function onColCountChange() {

    colCount = document.getElementById("col-count").value;
    storage.setItem("col-count", colCount);

    let images = [];
    const row = document.getElementById("output").firstChild;

    if (!row) {
        return
    }

    while (row.hasChildNodes()) {
        let col = row.lastChild;

        while (col.hasChildNodes()) {
            images.push(col.lastChild);
            col.removeChild(col.lastChild);
        }
        row.removeChild(col);
    }

    resetGallery();

    images.forEach(img => appendToGallery(img));
}

