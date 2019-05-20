class CANFrame
{
    constructor({id: id, dlc: dlc, extendedId:extendedId, data:data})
    {
        this.id = id;
        this.dlc = dlc;
        this.extendedId = extendedId;
        this.data = data;
    }
}

module.exports = CANFrame;