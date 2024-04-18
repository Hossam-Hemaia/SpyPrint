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

exports.checkActivation = (os, activationData) => {
  try {
    const macAddress = this.getMacAddress(os);
    if (activationData.length > 0) {
      if (
        macAddress === activationData[0].mac &&
        activationData[0].isActive === 1
      ) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
};
