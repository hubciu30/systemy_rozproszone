const fs = require('fs');
const express = require("express");
const session = require('express-session');
const app = express();
const http = require('http').Server(app)
const io = require('socket.io')(http);

// import pliku konfiguracyjnego
let config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// pamiec serwera
let CACHE = 
{
  active: 0
};

app.use(session({
	secret: '_secret_',
	resave: true,
	saveUninitialized: true
}));

app.use(express.urlencoded({extended: true, limit:config.file_limit}));
app.use(express.json({extended: true}));
// importuje plik z funkcjami middleware
const ApplicationController = require('./middleware/middleware.js');

// import modeli
require('./models/data')(app, config, ApplicationController);

// ustawiam pliki statyczne dla adresów
app.use('/', express.static(__dirname + "/public/"));
app.use('/home', express.static(__dirname + "/public/"));

// strona glowna
app.get("/", function(req, res){
  res.status(200).sendFile(__dirname + "/views/index.html");
});


// strona wlasciwa z plikami
app.get('/home', ApplicationController.islogged, (req, res)=>{
  res.status(200).sendFile(__dirname + "/views/home.html");

});


// dane usera
app.get('/user', ApplicationController.islogged, (req,res)=>
{
    const packet = 
    {
      nick: req.session.login,
      last_login: req.session.last_login,
      url: config.url,
      port: config.port
    }
    res.status(200);
    res.json(packet);
    res.end();
});

// logowanie & rejestracja
app.post('/auth', ApplicationController.auth);
app.post('/registr', ApplicationController.registration);
app.post('/ping',ApplicationController.islogged,(req,res)=>{res.status(200).end();});
// wyloguj
app.post('/logout', (req,res)=>{
  if(CACHE.active > 0) CACHE.active = CACHE.active-1;
  io.sockets.emit('active', CACHE.active);
  req.session.destroy();
  res.status(200).end();
});

// GNIAZDA
io.on('connection', (socket)=>
{

    CACHE.active = CACHE.active+1;
    socket.on('disconnect', ()=> 
    {
        if(CACHE.active > 0) CACHE.active = CACHE.active-1; 
        io.sockets.emit('active', CACHE.active);
    });

    socket.on('postNewFile', (data)=>
    {
      io.sockets.emit('getNewFile', data);
    });

    socket.on('postNewFolder', (data)=>
    {
      io.sockets.emit('getNewFolder', data);
    });

    socket.on('postDeleteFile', (data)=>
    {
      io.sockets.emit('getDeleteFile', data);
    });

    socket.on('postDeleteFolder', (data)=>
    {
      io.sockets.emit('getDeleteFolder', data);
    });

    socket.on('postRename', (data)=>{
      io.sockets.emit('getRename', data);
    });

    io.sockets.emit('active', CACHE.active);
});

// KONIEC GNIAZD

// start serwera
http.listen(config.port, async function()
{
	console.log("Inicjalizacja...");
	console.log("Serwer został uruchomiony na porcie\t"+ config.port);
});


