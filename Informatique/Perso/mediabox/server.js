#!/usr/bin/env node
/**
 * MediaBox v2 — Local Netflix
 * ffmpeg transcoding + TMDB posters + stats + notes
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const https = require('https');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
const CONFIG_FILE = path.join(__dirname, 'mediabox.config.json');
const CACHE_FILE  = path.join(__dirname, 'mediabox.cache.json');
const POSTER_DIR  = path.join(__dirname, 'public', 'posters');

const VIDEO_EXTENSIONS = ['.mp4','.mkv','.avi','.mov','.wmv','.flv','.webm','.m4v','.ts','.m2ts'];
const SUBTITLE_EXTENSIONS = ['.srt','.vtt','.ass','.ssa','.sub'];
const BROWSER_NATIVE = new Set(['.mp4','.webm','.m4v','.ogg']);

const MIME_TYPES = {
  '.mp4':'video/mp4','.mkv':'video/x-matroska','.avi':'video/x-msvideo',
  '.mov':'video/quicktime','.wmv':'video/x-ms-wmv','.flv':'video/x-flv',
  '.webm':'video/webm','.m4v':'video/mp4','.ts':'video/mp2t','.m2ts':'video/mp2t',
  '.srt':'text/plain','.vtt':'text/vtt','.html':'text/html',
  '.js':'application/javascript','.css':'text/css','.json':'application/json',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp',
};

// TMDB — clé publique de demo (lecture seule, images uniquement)
const TMDB_KEY = '4f4f5be64ba4f1b3e87fc43e42c6d7b7';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w500';

// ffmpeg
let FFMPEG_PATH = null;
try { const o = execSync('which ffmpeg 2>/dev/null || where ffmpeg 2>/dev/null',{encoding:'utf8'}).trim(); if(o) FFMPEG_PATH=o.split('\n')[0].trim(); } catch{}
if(!FFMPEG_PATH) for(const p of ['/usr/bin/ffmpeg','/usr/local/bin/ffmpeg','ffmpeg']){try{execSync(`"${p}" -version`,{stdio:'ignore'});FFMPEG_PATH=p;break;}catch{}}
console.log(FFMPEG_PATH?`✅ ffmpeg (${FFMPEG_PATH})`:'⚠️  ffmpeg non trouvé');

// Poster dir
if(!fs.existsSync(POSTER_DIR)) fs.mkdirSync(POSTER_DIR,{recursive:true});

// ─── CACHE (TMDB results) ────────────────────────────────────────────────────
function loadCache(){try{if(fs.existsSync(CACHE_FILE))return JSON.parse(fs.readFileSync(CACHE_FILE,'utf8'));}catch{}return{};}
function saveCache(c){try{fs.writeFileSync(CACHE_FILE,JSON.stringify(c,null,2));}catch{}}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function loadConfig(){try{if(fs.existsSync(CONFIG_FILE))return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'));}catch{}return{mediaDirs:[],watchedFiles:{},favorites:[],notes:{}};}
function saveConfig(c){fs.writeFileSync(CONFIG_FILE,JSON.stringify(c,null,2));}

// ─── TMDB FETCH ──────────────────────────────────────────────────────────────
function tmdbGet(endpoint){
  return new Promise((resolve,reject)=>{
    const url=`${TMDB_BASE}${endpoint}&api_key=${TMDB_KEY}&language=fr-FR`;
    https.get(url,{headers:{'User-Agent':'MediaBox/2.0'}},(r)=>{
      let d='';r.on('data',c=>d+=c);
      r.on('end',()=>{try{resolve(JSON.parse(d));}catch{reject(new Error('parse'));}});
    }).on('error',reject);
  });
}

function downloadImage(url, dest){
  return new Promise((resolve,reject)=>{
    if(fs.existsSync(dest)){resolve(dest);return;}
    const tmp=dest+'.tmp';
    const file=fs.createWriteStream(tmp);
    https.get(url,{headers:{'User-Agent':'MediaBox/2.0'}},(r)=>{
      if(r.statusCode!==200){file.close();fs.unlink(tmp,()=>{});reject(new Error('HTTP '+r.statusCode));return;}
      r.pipe(file);
      file.on('finish',()=>{file.close(()=>{fs.rename(tmp,dest,e=>e?reject(e):resolve(dest));});});
    }).on('error',(e)=>{file.close();fs.unlink(tmp,()=>{});reject(e);});
  });
}

async function fetchPoster(title, year, type, id){
  const cache=loadCache();
  const key=`poster_${id}`;
  if(cache[key]!==undefined) return cache[key]; // null = not found, string = path

  try{
    let posterPath=null;
    if(type==='movie'){
      const q=encodeURIComponent(title);
      const yr=year?`&year=${year}`:'';
      const res=await tmdbGet(`/search/movie?query=${q}${yr}`);
      const hit=res.results&&res.results[0];
      if(hit&&hit.poster_path){
        const fn=`${id}.jpg`;
        const dest=path.join(POSTER_DIR,fn);
        await downloadImage(`${TMDB_IMG}${hit.poster_path}`,dest);
        posterPath=`/posters/${fn}`;
        // Also store overview & rating
        cache[`meta_${id}`]={overview:hit.overview,rating:hit.vote_average,tmdbId:hit.id};
      }
    } else {
      // series
      const q=encodeURIComponent(title);
      const res=await tmdbGet(`/search/tv?query=${q}`);
      const hit=res.results&&res.results[0];
      if(hit&&hit.poster_path){
        const fn=`${id}.jpg`;
        const dest=path.join(POSTER_DIR,fn);
        await downloadImage(`${TMDB_IMG}${hit.poster_path}`,dest);
        posterPath=`/posters/${fn}`;
        cache[`meta_${id}`]={overview:hit.overview,rating:hit.vote_average,tmdbId:hit.id};
      }
    }
    cache[key]=posterPath;
    saveCache(cache);
    return posterPath;
  }catch(e){
    cache[key]=null;
    saveCache(cache);
    return null;
  }
}

// ─── MEDIA SCANNER ────────────────────────────────────────────────────────────
function scanDirectory(dirPath,results=[]){
  try{
    for(const e of fs.readdirSync(dirPath,{withFileTypes:true})){
      const fp=path.join(dirPath,e.name);
      if(e.isDirectory()) scanDirectory(fp,results);
      else if(e.isFile()&&VIDEO_EXTENSIONS.includes(path.extname(e.name).toLowerCase())) results.push(fp);
    }
  }catch{}
  return results;
}

function parseMediaName(filePath){
  const filename=path.basename(filePath,path.extname(filePath));
  const tvMatch=filename.match(/[Ss](\d{1,2})[Ee](\d{1,2})/);
  const tvMatch2=filename.match(/(\d{1,2})[xX](\d{1,2})/);
  if(tvMatch||tvMatch2){
    const m=tvMatch||tvMatch2;
    const season=parseInt(m[1]),episode=parseInt(m[2]);
    const matchStr=tvMatch?/[Ss]\d{1,2}[Ee]\d{1,2}/:/\d{1,2}[xX]\d{1,2}/;
    const beforeMatch=filename.substring(0,filename.search(matchStr));
    const afterMatch=filename.substring(filename.search(matchStr)+m[0].length);
    return{type:'series',showName:cleanName(beforeMatch)||path.basename(path.dirname(filePath)),season,episode,episodeTitle:cleanName(afterMatch)||`Episode ${episode}`};
  }
  const yearMatch=filename.match(/\b(19\d{2}|20\d{2})\b/);
  const year=yearMatch?parseInt(yearMatch[1]):null;
  let movieName=filename;
  if(year) movieName=filename.substring(0,filename.indexOf(yearMatch[0]));
  return{type:'movie',title:cleanName(movieName)||filename,year};
}

function cleanName(str){
  return str.replace(/\./g,' ').replace(/[_\-]+/g,' ')
    .replace(/\b(720p|1080p|2160p|4K|BluRay|BDRip|DVDRip|WEB-DL|WEBRip|HDTV|x264|x265|HEVC|AAC|AC3|DTS|HDR|SDR|YIFY|RARBG|XviD)\b/gi,'')
    .replace(/\s+/g,' ').trim();
}

function findSubtitles(videoPath){
  const dir=path.dirname(videoPath);
  const base=path.basename(videoPath,path.extname(videoPath));
  const subs=[];
  try{for(const e of fs.readdirSync(dir)){const ext=path.extname(e).toLowerCase();if(SUBTITLE_EXTENSIONS.includes(ext)&&e.startsWith(base))subs.push(path.join(dir,e));}}catch{}
  return subs;
}

function buildLibrary(mediaDirs){
  const allFiles=[];
  for(const d of mediaDirs) scanDirectory(d,allFiles);
  const movies={},series={};
  const cache=loadCache();
  for(const filePath of allFiles){
    const stat=fs.statSync(filePath);
    const info=parseMediaName(filePath);
    const id=Buffer.from(filePath).toString('base64url');
    const subtitles=findSubtitles(filePath).map(s=>({path:s,label:path.basename(s),id:Buffer.from(s).toString('base64url')}));
    const ext=path.extname(filePath).toLowerCase();
    const needsTranscode=!BROWSER_NATIVE.has(ext);
    const posterKey=`poster_${id}`;
    const metaKey=`meta_${id}`;
    const poster=cache[posterKey]||null;
    const tmdbMeta=cache[metaKey]||{};
    const base={id,path:filePath,size:stat.size,mtime:stat.mtime,ext,subtitles,needsTranscode,poster,...tmdbMeta};
    if(info.type==='movie'){
      movies[id]={...base,type:'movie',title:info.title,year:info.year};
    }else{
      const showKey=info.showName.toLowerCase().replace(/\s+/g,'-');
      if(!series[showKey]){
        const showId=showKey;
        const showPosterKey=`poster_${showId}`;
        const showMetaKey=`meta_${showId}`;
        series[showKey]={id:showId,showName:info.showName,type:'series',seasons:{},poster:cache[showPosterKey]||null,...(cache[showMetaKey]||{})};
      }
      if(!series[showKey].seasons[info.season]) series[showKey].seasons[info.season]=[];
      series[showKey].seasons[info.season].push({...base,season:info.season,episode:info.episode,episodeTitle:info.episodeTitle});
    }
  }
  for(const show of Object.values(series)) for(const s of Object.values(show.seasons)) s.sort((a,b)=>a.episode-b.episode);
  return{
    movies:Object.values(movies).sort((a,b)=>a.title.localeCompare(b.title)),
    series:Object.values(series).sort((a,b)=>a.showName.localeCompare(b.showName)),
  };
}

// ─── STREAM ───────────────────────────────────────────────────────────────────
function serveFile(res,filePath,mimeType){
  try{const s=fs.statSync(filePath);res.writeHead(200,{'Content-Type':mimeType,'Content-Length':s.size});fs.createReadStream(filePath).pipe(res);}
  catch{res.writeHead(404);res.end('Not found');}
}

function serveVideoStream(req,res,filePath){
  const ext=path.extname(filePath).toLowerCase();
  const needsTranscode=!BROWSER_NATIVE.has(ext);
  if(needsTranscode&&FFMPEG_PATH){
    const tParam=new URL(req.url,`http://localhost`).searchParams.get('t');
    const startSeconds=parseFloat(tParam)||0;
    console.log(`🎬 Transcode: ${path.basename(filePath)} +${startSeconds}s`);
    res.writeHead(200,{'Content-Type':'video/mp4','Transfer-Encoding':'chunked','Cache-Control':'no-cache','X-Transcoded':'1'});
    const args=['-hide_banner','-loglevel','error',...(startSeconds>0?['-ss',String(startSeconds)]:[]),'-i',filePath,'-c:v','libx264','-preset','ultrafast','-crf','23','-c:a','aac','-b:a','192k','-movflags','frag_keyframe+empty_moov+faststart','-f','mp4','pipe:1'];
    const ff=spawn(FFMPEG_PATH,args,{stdio:['ignore','pipe','ignore']});
    ff.stdout.pipe(res);
    req.on('close',()=>ff.kill('SIGKILL'));
    ff.on('error',(e)=>{console.error('ffmpeg:',e.message);try{res.end();}catch{}});
    ff.stdout.on('error',()=>ff.kill('SIGKILL'));
    return;
  }
  try{
    const stat=fs.statSync(filePath);
    const fileSize=stat.size;
    const mimeType=MIME_TYPES[ext]||'video/mp4';
    const range=req.headers.range;
    if(range){
      const parts=range.replace(/bytes=/,'').split('-');
      const start=parseInt(parts[0],10);
      const end=parts[1]?parseInt(parts[1],10):fileSize-1;
      res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${fileSize}`,'Accept-Ranges':'bytes','Content-Length':end-start+1,'Content-Type':mimeType});
      fs.createReadStream(filePath,{start,end}).pipe(res);
    }else{
      res.writeHead(200,{'Content-Length':fileSize,'Content-Type':mimeType,'Accept-Ranges':'bytes'});
      fs.createReadStream(filePath).pipe(res);
    }
  }catch{res.writeHead(500);res.end('Stream error');}
}

// ─── THUMBNAIL (première frame extraite) ─────────────────────────────────────
async function extractThumbnail(filePath, id){
  if(!FFMPEG_PATH) return null;
  const thumbDir=path.join(__dirname,'public','thumbs');
  if(!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir,{recursive:true});
  const dest=path.join(thumbDir,`${id}.jpg`);
  if(fs.existsSync(dest)) return `/thumbs/${id}.jpg`;
  return new Promise((resolve)=>{
    const args=['-hide_banner','-loglevel','error','-ss','60','-i',filePath,'-vframes','1','-q:v','3','-vf','scale=300:-1',dest];
    const ff=spawn(FFMPEG_PATH,args,{stdio:'ignore'});
    ff.on('close',(code)=>resolve(code===0?`/thumbs/${id}.jpg`:null));
    ff.on('error',()=>resolve(null));
    setTimeout(()=>{ff.kill();resolve(null);},15000);
  });
}

function parseBody(req){return new Promise((resolve)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{resolve(JSON.parse(b));}catch{resolve({});}});});}
function jsonResponse(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(data));}

// ─── SERVER ───────────────────────────────────────────────────────────────────
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://localhost:${PORT}`);
  const pathname=url.pathname;
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Range');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}

  // ── LIBRARY ────────────────────────────────────────────────────────────────
  if(pathname==='/api/library'&&req.method==='GET'){
    const config=loadConfig();
    const library=buildLibrary(config.mediaDirs);
    jsonResponse(res,{...library,config,ffmpegAvailable:!!FFMPEG_PATH});
    return;
  }

  // ── POSTER: fetch from TMDB ────────────────────────────────────────────────
  if(pathname==='/api/poster'&&req.method==='POST'){
    const body=await parseBody(req);
    const{title,year,type,id}=body;
    if(!title||!type||!id){jsonResponse(res,{error:'Missing params'},400);return;}
    try{
      const posterPath=await fetchPoster(title,year,type,id);
      const cache=loadCache();
      jsonResponse(res,{poster:posterPath,meta:cache[`meta_${id}`]||{}});
    }catch(e){jsonResponse(res,{error:e.message},500);}
    return;
  }

  // ── THUMBNAIL: extract frame from video ────────────────────────────────────
  if(pathname==='/api/thumbnail'&&req.method==='POST'){
    const body=await parseBody(req);
    const{id}=body;
    if(!id){jsonResponse(res,{error:'Missing id'},400);return;}
    try{
      const filePath=Buffer.from(id,'base64url').toString();
      if(!fs.existsSync(filePath)){jsonResponse(res,{error:'Not found'},404);return;}
      const thumb=await extractThumbnail(filePath,id);
      jsonResponse(res,{thumb});
    }catch(e){jsonResponse(res,{error:e.message},500);}
    return;
  }

  // ── WATCHED ────────────────────────────────────────────────────────────────
  if(pathname==='/api/watched'&&req.method==='POST'){
    const body=await parseBody(req);
    const config=loadConfig();
    if(!config.watchedFiles) config.watchedFiles={};
    if(body.action==='remove'){
      delete config.watchedFiles[body.id];
    }else{
      config.watchedFiles[body.id]={watchedAt:new Date().toISOString(),progress:body.progress||0,duration:body.duration||0};
    }
    saveConfig(config);jsonResponse(res,{success:true});return;
  }

  // ── PROGRESS ───────────────────────────────────────────────────────────────
  if(pathname==='/api/progress'&&req.method==='POST'){
    const body=await parseBody(req);
    const config=loadConfig();
    if(!config.watchedFiles) config.watchedFiles={};
    if(!config.watchedFiles[body.id]) config.watchedFiles[body.id]={};
    config.watchedFiles[body.id].progress=body.progress;
    config.watchedFiles[body.id].duration=body.duration;
    if(body.duration>0&&body.progress/body.duration>=0.8&&!config.watchedFiles[body.id].watchedAt){
      config.watchedFiles[body.id].watchedAt=new Date().toISOString();
    }
    saveConfig(config);jsonResponse(res,{success:true,autoMarked:!!(config.watchedFiles[body.id].watchedAt)});return;
  }

  // ── FAVORITES ──────────────────────────────────────────────────────────────
  if(pathname==='/api/favorites'&&req.method==='POST'){
    const body=await parseBody(req);
    const config=loadConfig();
    if(!config.favorites) config.favorites=[];
    if(body.action==='add'&&!config.favorites.includes(body.id)) config.favorites.push(body.id);
    else if(body.action==='remove') config.favorites=config.favorites.filter(f=>f!==body.id);
    saveConfig(config);jsonResponse(res,{success:true,favorites:config.favorites});return;
  }

  // ── NOTES ──────────────────────────────────────────────────────────────────
  if(pathname==='/api/notes'&&req.method==='POST'){
    const body=await parseBody(req);
    const config=loadConfig();
    if(!config.notes) config.notes={};
    if(body.note===null||body.note==='') delete config.notes[body.id];
    else config.notes[body.id]=body.note;
    saveConfig(config);jsonResponse(res,{success:true});return;
  }

  // ── CONFIG/DIRS ────────────────────────────────────────────────────────────
  if(pathname==='/api/config/dirs'&&req.method==='POST'){
    const body=await parseBody(req);
    const config=loadConfig();
    if(body.dir&&!config.mediaDirs.includes(body.dir)){
      if(fs.existsSync(body.dir)){config.mediaDirs.push(body.dir);saveConfig(config);jsonResponse(res,{success:true,config});}
      else jsonResponse(res,{success:false,error:'Dossier introuvable'},400);
    }else jsonResponse(res,{success:false,error:'Chemin invalide ou déjà ajouté'},400);
    return;
  }
  if(pathname==='/api/config/dirs'&&req.method==='DELETE'){
    const body=await parseBody(req);
    const config=loadConfig();
    config.mediaDirs=config.mediaDirs.filter(d=>d!==body.dir);
    saveConfig(config);jsonResponse(res,{success:true,config});return;
  }

  // ── STREAM ─────────────────────────────────────────────────────────────────
  if(pathname==='/api/stream'&&req.method==='GET'){
    const id=url.searchParams.get('id');
    if(!id){jsonResponse(res,{error:'Missing id'},400);return;}
    try{
      const filePath=Buffer.from(id,'base64url').toString();
      if(!fs.existsSync(filePath)){jsonResponse(res,{error:'Fichier introuvable'},404);return;}
      serveVideoStream(req,res,filePath);
    }catch{jsonResponse(res,{error:'ID invalide'},400);}
    return;
  }

  // ── SUBTITLE ───────────────────────────────────────────────────────────────
  if(pathname==='/api/subtitle'&&req.method==='GET'){
    const id=url.searchParams.get('id');
    if(!id){jsonResponse(res,{error:'Missing id'},400);return;}
    try{
      const filePath=Buffer.from(id,'base64url').toString();
      const ext=path.extname(filePath).toLowerCase();
      serveFile(res,filePath,MIME_TYPES[ext]||'text/plain');
    }catch{jsonResponse(res,{error:'ID invalide'},400);}
    return;
  }

  // ── STATIC ─────────────────────────────────────────────────────────────────
  let filePath=(pathname==='/'||pathname==='/index.html')?path.join(__dirname,'public','index.html'):path.join(__dirname,'public',pathname);
  if(!filePath.startsWith(path.join(__dirname,'public'))){res.writeHead(403);res.end('Forbidden');return;}
  if(fs.existsSync(filePath)&&fs.statSync(filePath).isFile()){
    const ext=path.extname(filePath).toLowerCase();
    serveFile(res,filePath,MIME_TYPES[ext]||'application/octet-stream');
  }else{res.writeHead(404);res.end('Not found');}
});

server.listen(PORT,()=>{
  console.log(`\n🎬  MediaBox v2 lancé !`);
  console.log(`    ➜  http://localhost:${PORT}\n`);
});
