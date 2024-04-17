const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

let readOption;
let readPath;
let host;
let eventListener;

setTimeout(() => {
  ipcRenderer.send("get_config_data");
}, 1000);

ipcRenderer.on("config_data", (e, data) => {
  readOption = data.readOption;
  readPath = data.readPath;
  defaultPrinter = data.defaultPrinter;
  machineNo = data.machineNo;
  host = data.host;
  eventListener = data.eventListener;
});

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
setTimeout(() => {
  if (readPath.length <= 0) {
    alert(
      "please select silent printing options first from configuration menu"
    );
  } else {
    watchFiles(path.join(readPath));
    if (readOption === "serverFile") {
      const socket = io(host, { transports: ["websocket", "polling"] });
      socket.on("connect", () => {
        alert("connected to server");
      });
      socket.on(`${eventListener}`, (event) => {
        ipcRenderer.send("print_remote", {
          path: event.fileUrl,
          machine: event.machineNo,
        });
      });
    }
  }
}, 2000);

ipcRenderer.on("error_print", () => {
  alert("incorrect file type! print pdf types only");
});
