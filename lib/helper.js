// Vendor imports
const appJson = require('../app.json');

// Main function:
const main = async () => {
  const args = process.argv.slice(2);
  const drivers = appJson.drivers;
  const filteredDrivers = drivers.filter((d) => d.capabilities.includes(args[0]));
  const mappedDrivers = filteredDrivers.map((d) => d.id);
  let prettyPrintDrivers = 'driver_id=';

  mappedDrivers.forEach((driver, index) => {
    if (index === mappedDrivers.length - 1) {
      prettyPrintDrivers = `${prettyPrintDrivers}${driver}`;
    } else {
      prettyPrintDrivers = `${prettyPrintDrivers}${driver}|`;
    }
  });

  prettyPrintDrivers = `${prettyPrintDrivers}&capabilities=${args[0]}`;
  
  console.log(prettyPrintDrivers);
};
main();
