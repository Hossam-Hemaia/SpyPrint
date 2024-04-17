const path = require("path");
const { app, BrowserWindow, Menu, dialog, ipcMain, Tray } = require("electron");
const DownloadManager = require("electron-download-manager");
const printer = require("pdf-to-printer");

const dbController = require("./controllers/dbController");
// set env
process.env.NODE_ENV = "production";
const isDev = process.env.NODE_ENV !== "production" ? true : false;
// db init

let readOption;
let readPath;
let defaultPrinter;
let machineNo;
let host;
let eventListener;

dbController.dbInit(app);
dbController.createConfigTable();

async function getConfigurationData() {
  const configs = await dbController.getConfigData();
  configs.forEach((row) => {
    readOption = row.readOption;
    readPath = row.readPath;
    defaultPrinter = row.defaultPrinter;
    machineNo = row.machineNo;
    host = row.host;
    eventListener = row.eventListener;
  });
}

await getConfigurationData();

ipcMain.on("set_configs", async (e, data) => {
  const configData = data.configData;
  dbController.setDataToConfigTable(configData);
  const configs = await dbController.getConfigData();
  configs.forEach((row) => {
    readOption = row.readOption;
    readPath = row.readPath;
    defaultPrinter = row.defaultPrinter;
    machineNo = row.machineNo;
    host = row.host;
    eventListener = row.eventListener;
  });
  e.sender.send("config_data", {
    readOption,
    readPath,
    defaultPrinter,
    host,
    eventListener,
    machineNo,
  });
});

let mainWindow;
let configWindow;
let tray;

DownloadManager.register({
  downloadFolder: readPath, //configData.printerOptions.readPath,
});

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Spy Print",
    width: 500,
    height: 600,
    icon: "./assets/icons/printer.png",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile("./assets/index.html");
}

function createConfigWindow() {
  configWindow = new BrowserWindow({
    title: "Configurations",
    width: 400,
    height: 550,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  configWindow.loadFile("./assets/config.html");
  isDev ? configWindow.webContents.openDevTools() : "";
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: "Configurations",
    width: 300,
    height: 300,
  });
  aboutWindow.loadFile("./assets/about.html");
}

const menu = [
  { role: "appMenu" },
  {
    label: "Settings",
    submenu: [
      {
        label: "Configure...",
        click: () => {
          createConfigWindow();
        },
      },
    ],
  },
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [{ role: "reload" }, { role: "forcereload" }],
        },
      ]
    : []),
  {
    label: "Info",
    submenu: [
      {
        label: "About Software",
        click: () => {
          createAboutWindow();
        },
      },
    ],
  },
];

app.on("ready", () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  console.log(isDev);
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  const icon = path.join(__dirname, "assets", "icons", "printer.png");
  tray = new Tray(icon);
  tray.on("click", () => {
    if (mainWindow.isVisible() === true) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
  tray.on("right-click", () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Quit",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.popUpContextMenu(contextMenu);
  });
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
    return true;
  });
});

const getPrinters = async () => {
  const printers = await require("electron")
    .webContents.getAllWebContents()[0]
    .getPrintersAsync();
  return printers;
};

ipcMain.on("get_config_data", async () => {
  mainWindow.webContents.send("config_data", {
    readOption,
    readPath,
    defaultPrinter,
    host,
    eventListener,
    machineNo,
  });
});

ipcMain.on("get_printers_list", async () => {
  printers = await getPrinters();
  configWindow.webContents.send("printers_list", { printers: printers });
});

ipcMain.on("open_dialog", () => {
  dialog
    .showOpenDialog({ properties: ["openDirectory"] })
    .then((result) => {
      if (!result.canceled) {
        let pathToFolder = result.filePaths[0];
        configWindow.webContents.send("folder_path", { pathToFolder });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

function convertToWindowsPath(filePath) {
  return filePath.replace(/\//g, "\\");
}

function isPdfType(filePath) {
  let fileExtension = path.extname(filePath).toLocaleLowerCase();
  return fileExtension === ".pdf";
}

function printFile(filePath, printerName) {
  let windowsFilePath = convertToWindowsPath(filePath);
  if (!isPdfType(windowsFilePath)) {
    mainWindow.webContents.send("error_print");
    return;
  }
  const options = {
    printer: printerName,
    silent: true,
  };
  printer
    .print(windowsFilePath, options)
    .then((result) => {
      console.log("printing file..");
    })
    .catch((err) => console.log(err));
}

ipcMain.on("print_silent", (e, data) => {
  printFile(data.path, defaultPrinter); //configData.printerOptions.defaultPrinter);
});

ipcMain.on("print_remote", (e, data) => {
  const machineNo = machineNo; //configData.printerOptions.machineNo;
  if (machineNo === data.machineNo) {
    DownloadManager.download(
      {
        url: data.path,
      },
      function (error, info) {
        if (error) {
          console.log(error);
          return;
        }
        console.log("Done Downloading");
      }
    );
  }
});

app.on("window-all-closed", () => {
  console.log("quiting...");
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows.length === 0) {
    createMainWindow();
  }
});
