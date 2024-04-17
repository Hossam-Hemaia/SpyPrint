const fs = require("fs").promises;
const path = require("path");
const { ipcRenderer } = require("electron");

const configFile = path.join(__dirname, "db", "appDb.json");
const printersListBtn = document.getElementById("plistBtn");
const selectPrinters = document.getElementById("plist");
const savePrinterConfig = document.getElementById("savPrntConf");
const folderDialog = document.getElementById("fldrdilg");
const output = document.getElementById("pthout");
const machineId = document.getElementById("mchnid");
const hostInput = document.getElementById("hostUrl");
const socketInput = document.getElementById("soktevnt");

folderDialog.addEventListener("click", () => {
  ipcRenderer.send("open_dialog");
});

printersListBtn.addEventListener("click", () => {
  ipcRenderer.send("get_printers_list");
});

ipcRenderer.on("printers_list", (e, data) => {
  for (let printer of data.printers) {
    let option = document.createElement("option");
    option.value = printer.name;
    option.innerText = printer.displayName;
    selectPrinters.append(option);
  }
});

ipcRenderer.on("folder_path", (e, data) => {
  output.innerText = data.pathToFolder;
});

savePrinterConfig.addEventListener("click", async () => {
  const data = await fs.readFile(configFile, "utf-8");
  const configData = JSON.parse(data);
  const selectedPrinter = selectPrinters.value;
  if (output.innerText.length > 0) {
    configData.printerOptions.readOption = "localFile";
    configData.printerOptions.readPath = output.innerText;
    configData.printerOptions.defaultPrinter = selectedPrinter;
    configData.printerOptions.machineNo = machineId.value;
    await fs.writeFile(configFile, JSON.stringify(configData));
    alert("configuration saved");
  } else {
    alert("you should select folder path first!");
  }
  let host = hostInput.value;
  let socketName = socketInput.value;
  if (socketName.length > 0) {
    configData.printerOptions.readOption = "serverFile";
    configData.printerOptions.host = host;
    configData.printerOptions.eventListener = socketName;
    configData.printerOptions.defaultPrinter = selectedPrinter;
    await fs.writeFile(configFile, JSON.stringify(configData));
    alert("configuration saved");
  } else {
    alert("Socket event name must be entered!");
  }
  window.close();
});
