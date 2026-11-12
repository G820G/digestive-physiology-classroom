import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
if(!fs.existsSync(path.join(root,'index.html'))){console.error('缺少 dist 目录，请先运行 npm install 和 npm run build。');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.bin':'application/octet-stream','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);});
});
let port=8765;
server.on('error',error=>{if(error.code==='EADDRINUSE'&&port<8775){port++;server.listen(port,'127.0.0.1');}else{console.error(error.message);process.exit(1);}});
server.on('listening',()=>{const url=`http://127.0.0.1:${port}/`;console.log(`\n消化与吸收交互课堂\n${url}\n保持此窗口运行，关闭窗口即可停止。\n`);if(!process.argv.includes('--no-open')){const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];spawn(command,args,{stdio:'ignore',windowsHide:true}).on('error',()=>{}).unref();}});
server.listen(port,'127.0.0.1');
