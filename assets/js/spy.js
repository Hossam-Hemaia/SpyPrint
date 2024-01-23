const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

const configFile = path.join(__dirname, "db", "appDb.json");

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

const data = fs.readFileSync(configFile, "utf-8");
const configData = JSON.parse(data);
const option = configData.printerOptions.readOption;
const hostPath = configData.printerOptions.readPath;
const socketEvent = configData.printerOptions.eventListener;
if (hostPath.length <= 0) {
  alert("please select silent printing options first from settings menu");
} else {
  if (option === "localFile") {
    watchFiles(path.join(hostPath));
  } else if (option === "serverFile") {
    const socket = io(hostPath, { transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      alert("connected to server");
    });
    socket.on(`${socketEvent}`, (data) => {
      console.log(data);
      ipcRenderer.send("print_silent", { path: data.fileUrl });
    });
  }
}

ipcRenderer.on("error_print", () => {
  alert("incorrect file type! print pdf types only");
});
