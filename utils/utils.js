exports.createLog = (msg) =>
{
    let ms = Date.now();
    let time = new Date(ms).toTimeString().split(' ')[0].split(':');
    time = "["+new Date(ms).toLocaleDateString() + " " + time[0]+":"+time[1]+":"+time[2]+"]";
    return time + "\t" + msg
};