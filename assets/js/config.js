const { ipcRenderer } = require("electron");

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
  const selectedPrinter = selectPrinters.value;
  const machineNo = machineId.value;
  let host = hostInput.value;
  let socketName = socketInput.value;
  if (selectPrinters === "" || output.innerText === "" || machineNo === "") {
    alert("pleas fill all required fields!");
    return;
  }
  const configs = [
    {
      readOption: socketName.length > 0 ? "serverFile" : "localFile",
      readPath: output.innerText,
      host: host,
      eventListener: socketName,
      defaultPrinter: selectedPrinter,
      machineNo: machineNo,
    },
  ];
  ipcRenderer.send("set_configs", { configData: configs });
  ipcRenderer.on("activation_error", (e) => {
    alert(
      "Your application is not active! please activate from activation menu"
    );
  });
  alert("configuration saved");
  window.close();
});
