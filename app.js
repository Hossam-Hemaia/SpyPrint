const fs = require("fs");
const path = require("path");
const os = require("os");
const { app, BrowserWindow, Menu, dialog, ipcMain, Tray } = require("electron");
const https = require("https");
const DownloadManager = require("electron-download-manager");
const printer = require("pdf-to-printer");
require("dotenv").config();

const dbController = require("./controllers/dbController");
const activateController = require("./controllers/activateController");

// set env
process.env.NODE_ENV = "dev";
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
dbController.createActivationTable();

ipcMain.on("get_mac_addr", (e) => {
  const macAddress = activateController.getMacAddress(os);
  e.sender.send("mac_addr", { macAddress, macAddress });
});

ipcMain.on("activation_success", (e, data) => {
  activationData = [
    {
      mac: data.macAddress,
      code: data.activationCode,
      expiryDate: data.expiryDate,
      isActive: 1,
    },
  ];
  dbController.setActivationData(activationData);
});

async function getApplicationIsActive() {
  const activationData = await dbController.getActivationData();
  const isActivated = activateController.checkActivation(os, activationData);
  if (isActivated) {
    return true;
  } else {
    return false;
  }
}

function removeOldFiles(folderPath) {
  try {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        throw err;
      }
      files.forEach((file) => {
        let filePath = path.join(folderPath, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            throw err;
          }
        });
      });
    });
  } catch (err) {
    throw err;
  }
}

async function getConfigurationData() {
  // dbController.deleteDatabaseTable("active");
  let isActive = await getApplicationIsActive();
  if (isActive) {
    const configs = await dbController.getConfigData();
    let folderPath = configs[0].readPath;
    removeOldFiles(folderPath);
    configs.forEach((row) => {
      readOption = row.readOption;
      readPath = row.readPath;
      defaultPrinter = row.defaultPrinter;
      machineNo = row.machineNo;
      host = row.host;
      eventListener = row.eventListener;
    });
  }
}

getConfigurationData();

ipcMain.on("set_configs", async (e, data) => {
  let isActive = await getApplicationIsActive();
  if (isActive) {
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
    app.quit();
  } else {
    e.sender.send("activation_error");
  }
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
    icon: path.join(__dirname, "assets", "icons", "win", "icon.ico"),
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

function createActivationWindow() {
  activationWindow = new BrowserWindow({
    title: "Activation",
    width: 400,
    height: 550,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  activationWindow.loadFile("./assets/activate.html");
  isDev ? activationWindow.webContents.openDevTools() : "";
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
      {
        label: "Activate...",
        click: () => {
          createActivationWindow();
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

ipcMain.on("get_config_data", async (e) => {
  let isActive = await getApplicationIsActive();
  if (isActive) {
    e.sender.send("config_data", {
      readOption,
      readPath,
      defaultPrinter,
      host,
      eventListener,
      machineNo,
    });
  } else {
    e.sender.send("activation_error");
  }
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
  printFile(data.path, defaultPrinter);
});

ipcMain.on("print_remote", async (e, data) => {
  const configs = await dbController.getConfigData();
  const machineNo = configs[0].machineNo;
  if (machineNo === data.machine) {
    const filePath = path.join(configs[0].readPath, `${Date.now()}.pdf`); // Adjust filename and path as needed
    const file = fs.createWriteStream(filePath);
    https
      .get(data.path, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log("File downloaded to:", filePath);
          printFile(data.path, defaultPrinter);
        });
      })

      .on("error", (err) => {
        fs.unlink(filePath, () => {}); // Delete the file if download fails
        console.error("Error downloading file:", err);
      });
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

/*
5- encrypt activation data
*/
