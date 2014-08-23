var drawTogheter;
var urlParams;
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();

function activate (target) {
    var buttons = document.getElementsByClassName("toolbutton");
    for (var k = 0; k < buttons.length; k++) {
        buttons[k].classList.remove("active");
    }
    target.classList.add("active");
}

function closeParent (target) {
    if (target.parentNode) {
        target.parentNode.style.display = 'none';
    }
}

function toggleById (id) {
    if (document.getElementById(id).style.display === "block") {
        document.getElementById(id).style.display = "";
    } else {
        document.getElementById(id).style.display = "block";
    }
}

function flashDonate () {
    document.getElementById('donatebutton').classList.add('flash');
    var times = 7;
    function execFlash () {
        if (times > 0) {
            if (document.getElementById('donatebutton').classList.contains('flash')) {
                document.getElementById('donatebutton').classList.remove('flash');
            } else {
                document.getElementById('donatebutton').classList.add('flash');
            }
            setTimeout(execFlash, 450);
            times--;
        } else {
            if (document.getElementById('donatebutton').classList.contains('flash')) {
                document.getElementById('donatebutton').classList.remove('flash');
            }
        }
    }
    setTimeout(execFlash, 450);
}

function start (mode, room) {
    document.getElementById("modeselection").style.display = "none";
    (document.getElementById("gameoverlay") || {style: {}}).style.display = "none";
    document.getElementById("tools").classList.remove("hidden");
    document.getElementById("mobilemenu").classList.remove("hidden");
    document.getElementById("drawregion").style.display = "block";
    var server = "http://drawtogheter.squarific.com:8475";
    var local = "http://127.0.0.1:8475";
    drawTogheter = new DrawTogheter(document.getElementById("drawregion"), local, mode, room);
    drawTogheter.socket.on('room', function (room) {
        document.getElementById('roominput').value = room;
    });
}

function resizeDrawRegion () {
    var tools = document.getElementById("tools");
    var drawRegion = document.getElementById("drawregion");
    drawRegion.style.height = Math.max(640, window.innerHeight - tools.offsetHeight - 150) + 'px';
}

setInterval(flashDonate, 5 * 60 * 1000);
window.addEventListener('resize', resizeDrawRegion);
resizeDrawRegion();

if (location.hash.substring(1)) {
    start('multi', location.hash.substring(1));
} else if (urlParams.gameroom) {
    start('game', urlParams.gameroom);
}

function togglezindex (id) {
    if (document.getElementById(id).style.zIndex == "1") {
        document.getElementById(id).style.zIndex = "";
        return;
    }
    document.getElementById(id).style.zIndex = "1";
}