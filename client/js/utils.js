var drawTogheter;

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
    drawTogheter = new DrawTogheter(document.getElementById("drawregion"), "http://drawtogheter.squarific.com:8475", mode, room);
    drawTogheter.socket.on('room', function (room) {
        document.getElementById('roominput').value = room;
    });
    document.getElementById("modeselection").style.display = "none";
    document.getElementById("tools").style.display = "block";
    document.getElementById("drawregion").style.display = "block";
}

function resizeDrawRegion () {
    var tools = document.getElementById("tools");
    var drawRegion = document.getElementById("drawregion");
    drawRegion.style.minHeight = Math.max(400, window.innerHeight - tools.offsetHeight - 150) + 'px';
}

setInterval(flashDonate, 5 * 60 * 1000);
window.addEventListener('resize', resizeDrawRegion);
resizeDrawRegion();

if (location.hash.substring(1)) {
    start('multi', location.hash.substring(1));
}