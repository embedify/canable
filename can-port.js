let SerialPort = require('serialport');
let CANFrame = require('./can-frame');
const EventEmitter = require('events');

String.prototype.forEach = function(callback) {
    for(let i = 0; i < this.length; i++){
        callback(this.charAt(i));
    }
}

function printHexString(number, padding)
{
    let stringyNumber = number.toString(16);

    if(stringyNumber.length < padding)
    {
        return "0".repeat(padding - stringyNumber.length) + stringyNumber;
    }
    else
    {
        return stringyNumber;
    }
}

class CANPort extends EventEmitter
{
    constructor(port)
    {
        super();
        this.serialPort = new SerialPort(port, {baudRate: 115200});
        this.frameBuffer = [];
        this.send.bind(this);
    }

    open()
    {
        function handlerFactory(self)
        {
            return function handleNewData(data)
            {
                data = data.toString();
                data.forEach((char) => {
                    switch(char)
                    {
                    case 't':   // SOF
                    case 'T':
                        self.frameBuffer = char;
                        break;
                    case '\r':  // EOF
                        self.emit('data', self.processStringyFrame(self.frameBuffer));
                        break;
                    default:    // Frame data
                        self.frameBuffer += char;
                        break;
                    }
                });
            }
        }
        
        this.serialPort.on('data', handlerFactory(this));
        this.serialPort.write("O\r");
    }

    close()
    {
        this.serialPort.write("C\r");
        this.serialPort.close();
    }

    send(message)
    {
        let stringyFrame = "";

        if(message.extendedId)
        {
            stringyFrame += 'T' + printHexString(message.id, 8);
        }
        else
        {
            stringyFrame += 't' + printHexString(message.id, 4);
        }

        stringyFrame += message.dlc.toString(16);

        for(let i = 0; i < message.dlc; i++)
        {
            stringyFrame += printHexString(message.data[i], 2);
        }

        stringyFrame += '\r';

        console.log(stringyFrame);

        this.serialPort.write(stringyFrame);
    }

    setBitRate(rate)
    {
        switch(rate)
        {
        case 10000:
            this.serialPort.write("S0\r");
            break;
        case 20000:
            this.serialPort.write("S1\r");
            break;
        case 50000:
            this.serialPort.write("S2\r");
            break;
        case 100000:
            this.serialPort.write("S3\r");
            break;
        case 125000:
            this.serialPort.write("S4\r");
            break;
        case 250000:
            this.serialPort.write("S5\r");
            break;
        case 500000:
            this.serialPort.write("S6\r");
            break;
        case 750000:
            this.serialPort.write("S7\r");
            break;
        case 1000000:
            this.serialPort.write("S8\r");
            break;
        default:
            throw new Error("Unsupported bit rate");
        }
    }

    static async listSerialPorts(forceListAll)
    {
        if(forceListAll)
        {
            return await SerialPort.list();
        }
        else
        {
            let ports = await SerialPort.list();
            let canSerialPorts = [];

            ports.forEach((port) => {
                if(port.vendorId == 'AD50' && port.productId == '60C4')
                {
                    canSerialPorts.push(port);
                }
            });

            return canSerialPorts;
        }
    }

    // Private functions
    processStringyFrame(stringyFrame)
    {   
        let idLength, extended;

        switch(stringyFrame.charAt(0))
        {
        case "T":   // Extended ID
            idLength = 8;  
            extended = true;
            break;
        case "t":   // Standard ID
            idLength = 4;
            extended = false;
            break;
        default:
            // Error case
            this.emit("error", "Unknwon message type from CANable received\rMessage: " + stringyFrame);
            return; // No further processing required
        }

        let id = parseInt(stringyFrame.slice(1, 1 + idLength), 16);
        let dlc = parseInt(stringyFrame.slice(1 + idLength, 2 + idLength), 16);
        let data = [];

        for(let i = 0; i < dlc; i++)
        {
            data.push(parseInt(stringyFrame.slice((2 + idLength) + 2 * i, (4 + idLength) + 2 * i), 16));
        }

        return new CANFrame({
            id: id,
            dlc: dlc,
            extendedId: extended,
            data: data
        });
    }
}

module.exports = CANPort;