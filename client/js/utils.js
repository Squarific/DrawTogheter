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
