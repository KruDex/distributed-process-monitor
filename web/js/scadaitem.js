class ScadaItem {
    constructor(host, serviceName, hash, ws) {

        //filling in the important elements in common data
        this.hostName = host
        this.serviceName = serviceName
        this.hash = hash
        this.ws = ws
    }

    createHTML() {
        //create the HTML representation
        let rootNode = document.getElementById("RoverSystems")
        let itemNode = document.createElement("div")
        itemNode.className = "item"

        //this is more like an legend
        let elementRootInfo = document.createElement("div")
        elementRootInfo.className = "SystemElementInfo"

        //Host info legend 
        let hostNodeInfo = document.createElement("p")
        hostNodeInfo.className = "hostInfoClass"
        hostNodeInfo.innerHTML = "Host computer"

        //ssh/conn info legend
        let connNodeInfo = document.createElement("p")
        connNodeInfo.className = "conInfoClass"
        connNodeInfo.innerHTML = "CNX/SSH"

        //the left side
        let leftSideDiv = document.createElement("div")
        leftSideDiv.className = "LeftSide"

        //Process info legend
        let nameNodeInfo = document.createElement("p")
        nameNodeInfo.className = "nameInfoClass"
        nameNodeInfo.innerHTML = "Process name"

        let statusNodeInfo = document.createElement("p")
        statusNodeInfo.className = "statusInfoClass"
        statusNodeInfo.innerHTML = "Process status"

        //Element root (this is where the information is)
        let elementRoot = document.createElement("div")
        elementRoot.className = "BasicElementContent"

        //Name
        let nameNode = document.createElement("p")
        nameNode.className = "nameClass"
        nameNode.innerHTML = this.serviceName

        //Host
        let hostNode = document.createElement("p")
        hostNode.className = "hostClass"
        hostNode.innerHTML = this.hostName

        //Connection Status
        this.connStatusNode = document.createElement("p")
        this.connStatusNode.className = "statusClass"
        this.connStatusNode.innerHTML = "unknown"

        //Process Status
        this.statusNode = document.createElement("p")
        this.statusNode.className = "statusClass"
        this.statusNode.innerHTML = "unknown"

        //start Button
        this.startButton = document.createElement("button")
        this.startButton.className = "CtrlButton"
        this.startButton.innerHTML = "(Re)Start"
        //callback
        this.startButton.onclick = this.onStartButton.bind(this)

        //stop Button
        this.stopButton = document.createElement("button")
        this.stopButton.className = "CtrlButton"
        this.stopButton.innerHTML = "Stop"
        //callback
        this.stopButton.onclick = this.onStopButton.bind(this)

        //journal display
        this.journalDisplay = document.createElement("div")
        this.journalDisplay.className = "JournalDisplay"
        this.journalDisplay.innerHTML = "..."

        //the status in between 
        let statusLegend = document.createElement("div")
        statusLegend.className = "StatusLegend"

        //the info about the process and connecetion state
        let statusInfo= document.createElement("div")
        statusInfo.className = "StatusInfo"

        let buttonBar = document.createElement("div")
        buttonBar.className = "ButtonBar"
        

        //append the elements to the panel
        rootNode.appendChild(itemNode)

        elementRoot.appendChild(hostNode)
        elementRoot.appendChild(nameNode)
        statusInfo.appendChild(this.connStatusNode)
        statusInfo.appendChild(this.statusNode)
        buttonBar.appendChild(this.startButton)
        buttonBar.appendChild(this.stopButton)

        //append the legend items to the info panel
        elementRootInfo.appendChild(hostNodeInfo)
        elementRootInfo.appendChild(nameNodeInfo)
        statusLegend.appendChild(connNodeInfo)
        statusLegend.appendChild(statusNodeInfo)

        //append all to root
        itemNode.appendChild(elementRootInfo)
        itemNode.appendChild(leftSideDiv)
        itemNode.appendChild(this.journalDisplay)
        leftSideDiv.appendChild(elementRoot)
        leftSideDiv.appendChild(statusLegend)
        leftSideDiv.appendChild(statusInfo)
        leftSideDiv.appendChild(buttonBar)
    }

    onStartButton() {
        let msg = {
            command: "restart",
            hash: this.hash
        }
        this.ws.send(JSON.stringify(msg))
    }

    onStopButton() {
        let msg = {
            command: "stop",
            hash: this.hash
        }
        this.ws.send(JSON.stringify(msg))
    }
}