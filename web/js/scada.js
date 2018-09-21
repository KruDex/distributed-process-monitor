//some global variables
let elements = []
//change this for better debugging and development e.g. switching to a dev friendly webserver with browsersync
let webSocketDevAddress = "ws://localhost:8888/ws"
let webSocketProductionAdress = "ws://" + location.host + "/ws"
let webSocketAddress = webSocketProductionAdress

function onConnectionFailure() {
    let node = document.getElementById("RoverSystems")
    node.innerHTML = "No connection - refresh browser and/or check server"
    node.style.color = "red"
    //node.disabled = true
}

function startScada() {
    //check which items the server
    console.log (webSocketProductionAdress)
    //adding items
    //elements.push(new ScadaItem("192.168.1.82", "mainCam"))
    //elements.push(new ScadaItem("192.168.1.80", "drive"))
    //elements.push(new ScadaItem("192.168.1.82", "auxCam"))

    //create the websocket connection (global variable)
    let ws = new WebSocket(webSocketAddress)
    ws.onopen = function (event) {
        console.log("Socket open")
        document.getElementById("RoverSystems").innerHTML = "Connected to server"
    }
    ws.onerror = function (event) {
        console.log("Socket error")
        onConnectionFailure()
    }
    ws.onclose = function (event) {
        console.log("Socket closed")
        onConnectionFailure()
    }

    ws.onmessage = function event(event) {
        let msg = JSON.parse(event.data)
        //check the message type
        if (msg["type"]) {
            if (msg.type == "init") {
                console.log("Init Message received")
                //populate the list
                for (let item of msg["items"]) {
                    elements.push(new ScadaItem(item.hostname, item.processname, item.hash, ws))
                }

                elements.sort(function (a, b) {
                    return a.hostName > b.hostName;
                })

                //populate the website
                for (let e of elements) {
                    e.createHTML()
                }

            }
            else {
                console.log("Update Message received")
                //find the hash
                for (let element of elements) {
                    //console.log(element.statusNode.innerHTML)
                    let match = msg["items"].filter(e => e.hash === element.hash)
                    if (match.length != 1) {
                        throw "Something in the update list is not right"
                    }
                    element.statusNode.innerHTML = match[0].processstatus
                    element.connStatusNode.innerHTML = match[0].sshstatus

                    //the visuals
                    if (match[0].sshstatus == "okay") {
                        element.connStatusNode.style.color = "green"
                        element.startButton.disabled = false
                        element.stopButton.disabled = false
                        //console.log(a)
                    } else {
                        element.connStatusNode.style.color = "red"
                        element.startButton.disabled = true
                        element.stopButton.disabled = true
                    }

                    if (match[0].processstatus == "active") {
                        element.statusNode.style.color = "green"
                        element.startButton.disabled = false
                        element.stopButton.disabled = false
                    } else if (match[0].processstatus == "inactive") {
                        element.statusNode.style.color = "orange"
                        element.startButton.disabled = false
                        element.stopButton.disabled = false
                    } else if (match[0].processstatus == "failed") {
                        element.statusNode.style.color = "red"
                        element.startButton.disabled = false
                        element.stopButton.disabled = false
                    } else {
                        element.statusNode.style.color = "red"
                        element.startButton.disabled = true
                        element.stopButton.disabled = true
                    }
                    element.journalDisplay.innerHTML = (match[0].journal)
                }
            }
        } else {
            console.log("other message")
        }
    }
}