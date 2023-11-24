// epsile
// created by djazz

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

	var domID = function (id) { return document.getElementById(id); };
    var socket;
    var welcomeScreen = domID('welcomeScreen');
    var chatWindow = domID('chatWindow');
    var chatMainDiv = domID('chatMainDiv');
    var chatArea = domID('chatArea');
    var disconnectButton = domID('disconnectButton');
    var startButton = domID('startButton');
    var isTypingDiv = domID('isTypingDiv');
    var peopleOnlineSpan = domID('peopleOnlineSpan');
    var alertSound = domID('alertSound');
    var isBlurred = false;
    var notify = 0;
    var firstNotify = true;
    var lastNotify = null;
    var notifyTimer = null;
    var url_pattern = /https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w/_\.]*(\?\S+)?)?)?/;
    var typingtimer; // Declare typingtimer variable
    var disconnectType; // Declare disconnectType variable
	var isTyping; // Declare isTyping variable


    // mute the notification sound
    // alertSound.volume = 0.0;

    function setTyping(state) {
        isTypingDiv.style.bottom = state ? '80px' : `${80 - isTypingDiv.offsetHeight}px`;
    }

    function createConnection() {
        // connect to the socket.io server running on the same host/port
        socket = io('http://localhost:8001');

        chatMainDiv.innerHTML = '';
        logChat(0, 'Connecting to server...');

        socket.on('connect', () => {
            chatMainDiv.innerHTML = '';
            logChat(0, 'Waiting for a stranger..');
            setTyping(false);
        });

        socket.on('conn', () => {
            // Connected
            chatMainDiv.innerHTML = '';
            logChat(0, 'You are now chatting with a random stranger. Say hi!');
            disconnectButton.disabled = false;
            disconnectButton.value = 'Disconnect';
            chatArea.disabled = false;
            chatArea.value = '';
            chatArea.focus();
        });

        socket.on('disconn', (data) => {
            const { who, reason } = data;
            chatArea.disabled = true;

            switch (who) {
                case 1:
                    logChat(0, 'You disconnected.');
                    break;
                case 2:
                    logChat(0, 'Stranger disconnected.');
                    if (reason) {
                        logChat(0, `Reason: ${reason}`);
                    }
                    break;
            }
            clearTimeout(typingtimer);
            setTyping(false);
            disconnectButton.disabled = false;
            disconnectType = true;
            disconnectButton.value = 'New';
            chatArea.disabled = true;
            chatArea.focus();
        });

        socket.on('chat', (message) => {
            logChat(2, message);
            alertSound.currentTime = 0;
            if (isBlurred) {
                // alertSound.play();
            }
        });

        socket.on('typing', (state) => {
            setTyping(state);
        });

        socket.on('stats', (stats) => {
            if (stats.people !== undefined) {
                peopleOnlineSpan.innerHTML = stats.people;
            }
        });

        socket.on('disconnect', () => {
            logChat(0, 'Connection imploded');
            logChat(-1, "<input type=button value='Reconnect' onclick='startChat();'>");
            peopleOnlineSpan.innerHTML = '0';
            chatArea.disabled = true;
            disconnectButton.disabled = true;
            setTyping(false);
            disconnectType = false;
        });
        socket.on('error', (e) => {
            logChat(0, 'Connection error');
            logChat(-1, "<input type=button value='Reconnect' onclick='startChat();'>");
            peopleOnlineSpan.innerHTML = '0';
            chatArea.disabled = true;
            disconnectButton.disabled = true;
            setTyping(false);
            disconnectType = false;
        });
    }

    function logChat(type, message) {
        let who = '';
        let who2 = '';
        let message2 = message;
        const node = document.createElement('div');

        if (type > 0) {
            if (type === 2) {
                who = "<span class='strangerChat'>Stranger: </span>";
                who2 = 'Stranger: ';
            } else {
                who = "<span class='youChat'>You: </span>";
            }

            if (message.substr(0, 4) === '/me ') {
                message = message.substr(4);
                if (type === 2) {
                    who = "<span class='strangerChat'>*** Stranger </span>";
                    who2 = '*** Stranger ';
                } else {
                    who = "<span class='youChat'>*** You </span>";
                }
            }

            message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const msg = message.split(' ');

            for (let i = 0; i < msg.length; i += 1) {
                if (url_pattern.test(msg[i]) && msg[i].indexOf('"') === -1) {
                    msg[i] = `<a href="${msg[i].replace(/\n/g, '')}" target="_blank">${msg[i].replace(/\n/g, '<br>')}</a>`;
                } else {
                    msg[i] = msg[i].replace(/\n/g, '<br>');
                }
            }

            message = msg.join(' ');
            node.innerHTML = who + message;
        } else {
            node.innerHTML = `<span class='consoleChat'>${message}</span>`;
        }

        chatMainDiv.appendChild(node);
        chatMainDiv.scrollTop = chatMainDiv.scrollHeight;
        chatMainDiv.scrollLeft = 0;

        if (isBlurred && (type === 0 || type === 2)) {
            alertSound.play();

            if (firstNotify && notify > 0 && window.Notification && window.Notification.permission === 'granted') {
                clearTimeout(notifyTimer);

                if (lastNotify) lastNotify.close();

                lastNotify = new Notification(`Epsile${type === 0 ? ' Message' : ''}`, { body: who2 + message2 });
                firstNotify = false;

                notifyTimer = setTimeout(() => {
                    lastNotify.close();
                }, 7 * 1000);
            }
        }
    }

    function startChat() {
        if (window.Notification && notify === 0) {
            if (window.Notification.permission === 'granted') {
                notify = 2;
            } else {
                window.Notification.requestPermission();
                notify = 1;
            }
        }

        welcomeScreen.style.display = 'none';
        chatWindow.style.display = 'block';
        createConnection();
    }

    function newStranger() {
        if (socket) {
            chatArea.disabled = true;
            disconnectButton.disabled = true;
            socket.emit('new');
            chatArea.value = '';
            chatArea.focus();
            chatMainDiv.innerHTML = '';
            setTyping(false);
            disconnectType = false;
            disconnectButton.value = 'Disconnect';
        }
    }

    function doDisconnect() {
        if (disconnectType === true) {
            disconnectType = false;
            disconnectButton.value = 'Disconnect';
            newStranger();
        } else if (socket) {
            socket.emit('disconn');
            chatArea.disabled = true;
            chatArea.focus();
            disconnectType = true;
            disconnectButton.disabled = true;
            disconnectButton.value = 'Disconnect';
        }
    }

    function onReady() {
        startButton.disabled = false;
        startButton.focus();
    }

    function blurred() {
        isBlurred = true;
        firstNotify = true;
    }

    function focused() {
        isBlurred = false;

        if (lastNotify) lastNotify.close();
        if (notifyTimer) clearTimeout(notifyTimer);
    }

    window.addEventListener('blur', blurred, false);
    window.addEventListener('focus', focused, false);

    disconnectButton.addEventListener('click', doDisconnect, false);
    chatArea.addEventListener('keypress', (e) => {
        const kc = e.keyCode;

        if (kc === 13) {
            if (!e.shiftKey) {
                const msg = chatArea.value;

                if (msg.length > 0) {
                    if (typingtimer !== null) {
                        clearTimeout(typingtimer);
                    }

                    if (isTyping) {
                        socket.emit('typing', false); // Not typing
                    }

                    isTyping = false;
                    socket.emit('chat', msg);
                    logChat(1, msg);
                    chatArea.value = '';
                }

                e.preventDefault();
                e.returnValue = false;
                return false;
            }
        }
    }, false);

    chatArea.addEventListener('keyup', (e) => {
        if (socket) {
            if (typingtimer !== null) {
                clearTimeout(typingtimer);
            }

            if (chatArea.value === '' && isTyping) {
                socket.emit('typing', false); // Not typing
                isTyping = false;
            } else {
                if (!isTyping && chatArea.value.length > 0) {
                    socket.emit('typing', true);
                    isTyping = true;
                }

                typingtimer = setTimeout(() => {
                    if (socket && isTyping) {
                        socket.emit('typing', false); // Not typing
                    }

                    isTyping = false;
                }, 10 * 1000);
            }
        }
    }, false);

    startButton.addEventListener('click', startChat, false);

    onReady(); // Call onReady when the DOM is loaded
});
