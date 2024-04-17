const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

const configFile = path.join(__dirname, "db", "appDb.json");
const data = fs.readFileSync(configFile, "utf-8");
const configData = JSON.parse(data);
const option = configData.printerOptions.readOption;
const hostPath = configData.printerOptions.readPath;
const hostServer = configData.printerOptions.host;
const socketEvent = configData.printerOptions.eventListener;

const isFileExist = (filePath) => {
  try {
    fs.access(filePath, fs.constants.F_OK, async (err) => {
      if (err) {
        console.log(err);
        return;
      } else {
        ipcRenderer.send("print_silent", { path: filePath });
      }
    });
  } catch (err) {
    console.log(err);
  }
};

const watchFiles = (folderPath) => {
  try {
    fs.watch(folderPath, (eventType, fileName) => {
      if (eventType === "rename") {
        const newFilePath = `${folderPath}/${fileName}`;
        isFileExist(newFilePath);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

if (hostPath.length <= 0) {
  alert("please select silent printing options first from settings menu");
} else {
  watchFiles(path.join(hostPath));
  if (option === "serverFile") {
    const socket = io(hostServer, { transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      alert("connected to server");
    });
    socket.on(`${socketEvent}`, (event) => {
      ipcRenderer.send("print_remote", {
        path: event.fileUrl,
        machine: event.machineNo,
      });
    });
  }
}

ipcRenderer.on("error_print", () => {
  alert("incorrect file type! print pdf types only");
});
