import { SerialPort } from "serialport";

const ports = await SerialPort.list();

if (!ports.length) {
  console.log("No serial ports found.");
} else {
  ports.forEach((port) => {
    console.log(
      `${port.path}\t${port.manufacturer || ""}\t${port.friendlyName || ""}\t${port.serialNumber || ""}`,
    );
  });
}
