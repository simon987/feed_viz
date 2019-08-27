let maxImages = 300;
let currentImages = 0;

let socket = undefined;

let colCount = 4;
let cols = [];
let colHeights = [];

let loadNsfw = false;

let storage = window.localStorage;
let chips;
let exchange = "reddit";

let helpModal;

window.onload = function () {

    M.Tabs.init(document.getElementById("tabs"), {});
    M.FormSelect.init(document.querySelectorAll("select"), {});
    M.Chips.init(document.querySelectorAll(".chips"), {
        placeholder: "Type topic and press 'Enter'",
        secondaryPlaceholder: "+Topic",
        onChipAdd: function (elem, chip) {
            if (!validateTopic(chip.firstChild.wholeText)) {
                helpModal.open();
                chips.deleteChip(chips.chipsData.length - 1);
            }
        }
    });
    chips = M.Chips.getInstance(document.getElementById("chips"));
    M.Modal.init(document.querySelectorAll(".modal"), {});
    helpModal = M.Modal.getInstance(document.getElementById("help"));

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

    document.getElementById("topics")
        .dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {bubbles: true, cancelable: true, key: "Enter", keyCode: 13}
            )
        );

    if (socket) {
        socket.close()
    }

    document.getElementById("connect").innerHTML = "Connecting..";
    document.getElementById("connect").classList.add("connecting");

    resetGallery();

    let topics = chips.chipsData.map(chip => chip.tag);

    if (topics.length === 0) {
        alert("You must specify at least one topic");
        return
    }

    connect(exchange, topics);
}

function connect(exchange, topics) {

    socket = new WebSocket("wss://feed.the-eye.eu/socket");

    socket.onmessage = msg => {
        let j = JSON.parse(msg.data);

        if (j.urls && ((loadNsfw && j.over_18) || !j.over_18 || !j.hasOwnProperty("over_18"))) {
            j.urls
                .filter(url => /http?s:\/\/.*(.jpg|.jpeg|.bmp|.png|.gif|.jpeg:orig|.jpg:orig)$/.test(url))
                .forEach(url => appendToGallery(createImage(url, j)));
        }
    };

    socket.onopen = () => {
        socket.send(JSON.stringify({
            exchange: exchange,
            topics: topics
        }));

        document.getElementById("connect").innerHTML = "Connected";
        document.getElementById("connect").classList.remove("connecting");
        document.getElementById("connect").classList.remove("disconnected");
        document.getElementById("connect").classList.add("connected");
    };

    socket.onclose = (e) => {
        if (socket.readyState === socket.CLOSING || socket.readyState === socket.CLOSED) {
            console.log(socket);
            console.log(e);
            document.getElementById("connect").innerHTML = "Disconnected";
            document.getElementById("connect").classList.remove("connected");
            document.getElementById("connect").classList.remove("connecting");
            document.getElementById("connect").classList.add("disconnected");
        }
    };

    socket.onerror = (e) => {
        console.log(e)
    };

    window.onbeforeunload = function () {
        socket.close();
    }
}

function createImage(src, j) {
    const img = document.createElement("img");
    img.setAttribute("class", "img");
    img.setAttribute("src", src);
    if (exchange === "reddit") {
        img.onclick = function () {
            window.open("https://reddit.com/" + j["id"]);
        };
    }

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
            colHeights[i] -= cols[i].lastChild.height;
            cols[i].lastChild.remove();
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

    cols[min].prepend(child);

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
    setPreset("Reddit animals", ["*.aww", "*.awww", "*.cats", "*.eyebleach", "*.cute", "*.dogs",
        "*.koalas", "*.lynxes", "comment.dogs", "*.dogpictures", "submission.puppies", "submission.puppy",
        "submission.doge"]);
    setPreset("Reddit birds", ["submission.birds", "submission.bird", "submission.parrots",
        "submission.birdpics", "submission.birdwatching", "submission.birding", "submission.birdphotography"]);
    setPreset("Reddit ocean", ["*.ocean", "*.oceangifs", "*.swimming",
        "*.algae", "*.costalforaging", "*.earthscience", "*.freediving",
        "*.hydrology", "*.lifeaquatic", "*.marinelife", "*.octopuses",
        "*.scuba", "*.seacreatureporn", "*.seaweed", "*.sharks",
        "*.shipwrecks", "*.water", "*.whales", "*.underwaterphotography"]);
}

function onPresetSelect() {
    let selection = document.getElementById("presets").value;

    while (chips.chipsData.length > 0) {
        chips.deleteChip(0)
    }
    getPreset(selection).forEach(topic => {
        chips.addChip({tag: topic})
    });
    M.toast({html: "Loaded preset"})
}

function onSavePresetClick() {
    let name = document.getElementById("preset-name").value;
    let topics = chips.chipsData.map(chip => chip.tag);

    if (name === "") {
        alert("Invalid preset name");
        return;
    }

    setPreset(name, topics);
    updatePresets();
    M.toast({html: "Saved preset"})
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

function onExchangeChange() {
    exchange = document.getElementById("exchange").value;
    document.getElementById("nsfw").disabled = exchange !== "reddit"
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

function validateTopic(topic) {
    return (exchange === "reddit" && /^(#$|((submission|comment|\*)\.(\w+|\*)$))/.test(topic)) ||
        (exchange === "chan" && /^(#$|#\.\w+$|(4chan|lainchan|uboachan|22chan|wizchan|1chan|\*)\.(#$|(post|thread|\*)\.(\w+|\*)$))/.test(topic));
}
