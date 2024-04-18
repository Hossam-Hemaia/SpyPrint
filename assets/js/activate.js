const { ipcRenderer } = require("electron");
const activateBtn = document.getElementById("actvat");

const activateApp = (macAddress) => {
  const activationCode = document.querySelector("[name=activationCode]").value;
  const data = {
    activationCode,
    macAddress,
  };
  console.log(JSON.stringify(data));
  fetch(process.env.ACTIVATION_HOST, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      return res.json();
    })
    .then((result) => {
      if (result.success) {
        ipcRenderer.send("activation_success", { activationCode, macAddress });
        alert("activation success!");
        window.close();
      }
    })
    .catch((err) => {
      alert(err);
    });
};

if (activateBtn) {
  activateBtn.addEventListener("click", () => {
    ipcRenderer.send("get_mac_addr");
  });
  ipcRenderer.on("mac_addr", (e, data) => {
    activateApp(data.macAddress);
  });
}
