const os = require('os')
function getHost() {
  let interfaces = os.networkInterfaces();
  for(var derName in interfaces) {
    let iface = interfaces[derName]
    console.log('iface',iface)
    for(let i =0;i < iface.length;i++) {
      let alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address
      }
    }
  }
}
function getNatHost() {
    let localhost = getHost()
    return localhost.replace(/\./g,'-') + '.staff.zmops.cc'
}
console.log(getNatHost())