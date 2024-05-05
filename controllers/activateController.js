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
      const dateNow = Date.now();
      const date = new Date(dateNow);
      const expiryDate = new Date(activationData[0].expiryDate);
      const expiryTime = new Date(expiryDate).setHours(23, 0, 0, 0);
      const endDate = new Date(expiryTime);
      if (
        macAddress === activationData[0].mac &&
        activationData[0].isActive === 1 &&
        date < endDate
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
