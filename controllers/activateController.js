exports.getMacAddress = (os) => {
  try {
    const macAddresses = os.networkInterfaces();
    let macAddress;
    for (key in macAddresses) {
      if (macAddresses[key][0].mac !== "00:00:00:00:00:00") {
        macAddress = macAddresses[key][0].mac;
      }
    }
    return macAddress;
  } catch (err) {
    throw err;
  }
};
