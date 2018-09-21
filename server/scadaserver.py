#!/usr/bin/env python3
import paramiko
import re
import json
import time
import hashlib
import random
import os
from pathlib import Path
import tornado.ioloop
import tornado.web
import tornado.websocket
from tornado.ioloop import PeriodicCallback


class RemoteProcessChecker:
    def __init__(self):
        self.processlist = []

    def addLocation(self, hostname, username, processname, keyfile):
        # creating an ssh connection for this one
        key = paramiko.RSAKey.from_private_key_file(keyfile,password="hrilab")

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        # preparing the datastruct to use
        item = {
            "hostname": hostname,
            "username": username,
            "processname": processname,
            "sshclient": client,
            "sshstatus": "unknown",
            "processstatus": "unknown",
            "key": key,
            "hash": hashlib.sha224((hostname+processname).encode("utf-8")).hexdigest(),
            "journal": "nothing yet..."
        }

        # check if there is a connection problem with the ssh after connect
        try:
            client.connect(hostname=hostname, username=username,
                           pkey=key, timeout=2)
            item["sshstatus"] = "okay"
        except Exception as e:
            item["sshstatus"] = "CNX ERROR"

        self.processlist.append(item)

    def scanlocations(self):

        for location in self.processlist:
            try:
                stdin, stdout, stderr = location["sshclient"].exec_command(
                    'systemctl status ' + location["processname"])
            except Exception as e:
                #print ("Exception exec: " + str(e))
                location["sshstatus"] = "CMD ERROR"
                # if connection fails we do NOT know the process status
                location["processstatus"] = "unknown"
                # try to reconnect on 10% of all trials
                if random.randint(0, 5) == 5:
                    try:
                        location["sshclient"].connect(
                            hostname=location["hostname"], username=location["username"], pkey=location['key'], timeout=1)
                        location["sshstatus"] = "okay"
                    except Exception as e:
                        location["sshstatus"] = "CNX ERROR"
                # print(location)
                continue

            location["sshstatus"] = "okay"

            regex = r"(?<=Active:)\s(\w*)"

            textstdout = stdout.read().decode('utf-8')
            textstderr = stderr.read().decode('utf-8')

            if not textstdout:
                location["processstatus"] = "Process not found"
            else:
                matches = re.finditer(regex, textstdout, re.MULTILINE)

                for matchNum, match in enumerate(matches):
                    a = matchNum
                processString = match.group()[1:len(match.group())]
                location["processstatus"] = processString
            # print(location)

            # scan the journalctl
            stdin, stdout, stderr = location["sshclient"].exec_command(
                'journalctl -u ' + location["processname"] + " -n 10 --no-pager -o short --no-hostname --quiet")
            location["journal"] = stdout.read().decode('utf-8')


# globals
websockets = []
#scadaelements = []
pc = RemoteProcessChecker()
pc.addLocation("192.168.1.82", "root", "mainCam", "./lab_img")
pc.addLocation("192.168.1.82", "root", "auxCam", "./lab_img")
pc.addLocation("192.168.1.83", "root", "kukaCtrl", "./lab_img")
pc.addLocation("192.168.1.83", "root", "kukaProxy", "./lab_img")
pc.addLocation("192.168.1.85", "root", "kukaCtrl", "./lab_img")
pc.addLocation("192.168.1.85", "root", "kukaProxy", "./lab_img")
pc.addLocation("192.168.1.85", "root", "ambotProxy", "./lab_img")
pc.addLocation("192.168.1.85", "root", "ambotCtrl", "./lab_img")


def simpletest():
    # this function is not in use but was for testing purposes
    pctest = RemoteProcessChecker()
    pctest.addLocation("192.168.1.77", "tkrueger", "sshd", "./vm_rsa")
    pctest.addLocation("192.168.1.77", "tkrueger", "dumremy2", "./vm_rsa")
    pctest.addLocation("192.168.1.77", "tkrueger", "dummy1", "./vm_rsa")
    pctest.addLocation("192.168.1.78", "tkrueger", "dummy1", "./vm_rsa")

    pctest.scanlocations()


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")


class SocketHandler(tornado.websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        #print("WS open")
        if self not in websockets:
            websockets.append(self)
            # send the initial list
            items = []
            for item in pc.processlist:
                initcontent = {
                    "hostname": item["hostname"],
                    "processname": item["processname"],
                    "hash": item["hash"]
                }
                items.append(initcontent)

            msg = {
                "type": "init",
                "items": items
            }
            self.write_message(json.dumps(msg))

    def on_close(self):
        offset = 0
        for websocket in websockets:
            if websocket == self:
                break
            offset += 1
        websockets.pop(offset)

    def on_message(self, message):
        e = json.loads(message)
        # print(e)
        if "command" in e:
            print("command received: " + e["command"])
            if e["command"] == "start" or e["command"] == "stop" or e["command"] == "restart":
                # check if this is in the list
                for item in pc.processlist:
                    if item.get("hash") == e["hash"]:
                        # object found
                        #print ("starting" + item["hostname"], item["processname"])
                        try:
                            item["sshclient"].exec_command(
                                'systemctl ' + e["command"] + " " + item["processname"])
                        except:
                            item["sshstatus"] = "Cmd Error"
        else:
            print("other message")


def periodic_check():
    #print("Periodic Callback with num sockets: " + str(len(websockets)))
    pc.scanlocations()
    for websocket in websockets:
        items = []
        for item in pc.processlist:
            itemcontent = {
                "hostname": item["hostname"],
                "processname": item["processname"],
                "hash": item["hash"],
                "sshstatus": item["sshstatus"],
                "processstatus": item["processstatus"],
                "journal": item["journal"]
            }
            items.append(itemcontent)
        msg = {
            "type": "update",
            "items": items
        }
        websocket.write_message(json.dumps(msg))


def main():
    print("Go")
    webdir = os.path.join(str(Path().absolute().parents[0]), "web")

    print("webdir:" + str(webdir))
    app = tornado.web.Application([
        (r'/ws', SocketHandler),
        (r"/(.*)", tornado.web.StaticFileHandler,
         {"path": webdir, "default_filename": "index.html"}),

    ])
    cb = PeriodicCallback(periodic_check, 2000)
    cb.start()
    app.listen(8888)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
