// Vendor imports
const appJson = require('../app.json');

// Main function:
// node ./lib/helper.js  capabilities input_1
// node ./lib/helper.js cloud_drivers

const main = async () => {
  const args = process.argv.slice(2);
  const drivers = appJson.drivers;
  if (args[0] === 'cloud_drivers') {
    const filteredDrivers = drivers.filter((d) => d.id.includes("_cloud"));
    const mappedDrivers = filteredDrivers.map((d) => d.id);
    let prettyPrintDrivers = '';

    mappedDrivers.forEach((driver, index) => {
      if (index === mappedDrivers.length - 1) {
        prettyPrintDrivers = `${prettyPrintDrivers}'${driver}'`;
      } else {
        prettyPrintDrivers = `${prettyPrintDrivers}'${driver}', `;
      }
    });

    prettyPrintDrivers = `[${prettyPrintDrivers}]`;

    console.log(prettyPrintDrivers);


  } else if (args[0] === 'capabilities') {
    const filteredDrivers = drivers.filter((d) => d.capabilities.includes(args[1]));
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
  }

};
main();
