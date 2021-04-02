const ftp = require("basic-ftp");
const fs = require('fs');


class FTPClient
{
  constructor(config){
    // config pod connecta
    this.host = config.host;
    this.user = config.user;
    this.password = config.password;
    this.secure = config.secure;

    // obiekt glowny
    this._client = new ftp.Client();
    this._client.verbose = false;

    // flagi
    this.connected = false;
    this.path = "/";
  }

  connect = async ()=>
  {
    try
    {
      await this._client.access(
      {
        host: this.host,
        user: this.user,
        password: this.password,
        secure: this.secure
      });
      this.connected = true;
    }
    catch(err)
    {
      this.connected = false;
    }
  }

  disconnect = ()=>
  {
    this._client.close();
    this.connected = false;
  }

  getList = async (url)=>
  {
    return await this._client.list(url);
  }

  cd = async (dirname)=>
  {
    await this._client.cd(dirname);
  }

  createDir = async(dirname)=>
  {
    await this._client.send("MKD " + dirname);
  }

  upload = async(filename, stream)=>
  {
    await this._client.uploadFrom(stream, filename);
  }

  download = async(path, filename)=>
  {
    const temp_path = './temp/'+filename
    await this._client.downloadTo(temp_path, path);
    return temp_path;
  }

  remove = async(filename)=>
  {
    await this._client.remove(filename);
  }
  
  removeDir = async(path)=>
  {
    await this._client.removeDir(path);
  }

  rename = async(path, oldName, newName)=>
  {
    await this.cd(path);
    await this._client.send('RNFR ' + oldName);
    await this._client.send('RNTO ' + newName);
  }

}

module.exports = FTPClient;