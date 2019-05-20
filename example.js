let CANPort = require('./index').CANPort;

(async ()=>{
    console.log(await CANPort.listSerialPorts());

    let can = new CANPort("COM25");

    can.open();
    can.setBitRate(125000);
    can.on('data', console.log);

    setInterval(() => {
        can.send({
            id: 1,
            extendedId: true,
            dlc: 8,
            data: [1, 2, 3, 4, 5, 6, 7, 8]
        });
    }, 5000);
})();
