class Client{
    constructor()
    {
        this.history = []; // historia
        this.path = "/"; // aktualna pozycja
        this.nick = null; // nazwa usera
        this.last_login = null; // ostatnie logowanie
        this.ls = []; // lista plikow,folderow w danej pozycji
        this.socket = io(); // gniazdo glowne    
    }

    getDate = (ms)=>{
        ms = parseInt(ms);
        let time = new Date(ms).toTimeString().split(' ')[0].split(':');
        //let packet = {date: new Date(ms).toLocaleDateString(), time: time[0]+":"+time[1]+":"+time[2]}
        return new Date(ms).toLocaleDateString() + " " + time[0]+":"+time[1]+":"+time[2];
    }

    // inicjalizacja
    init = async ()=>
    {
        this.history.push(this.path)
        this.PrzeladujPozycje();
        try
        {
            const response = await $.get('/user');
            this.nick = response.nick;
            this.last_login = response.last_login;
            $("#nick")[0].innerText= "Witaj " + this.nick+"!\nOstatnie logowanie:\n"+ this.getDate(this.last_login);
        }
        catch(err){
            console.error(err);
        }

    }

    // Operacje
    Przejdz = async (newPath)=>
    {
        this.path = this.path + newPath + "/";
        this.history.push(this.path);
        this.PrzeladujPozycje();
    }

    Wroc = async ()=>
    {
        this.history.pop();
        this.path = this.history[this.history.length-1];
        this.PrzeladujPozycje();
    }

    PrzeladujPozycje = async ()=>
    {   
        // czysc tabele
        $("#ftp_list")[0].innerHTML = '';
        try
        {
            this.ls = await $.get("/data", {url:this.path});
            // rysuj foldery
            for(let dir of this.ls)
            {
                if(dir.type === 2){
                    this.RysujFolder(dir.name, '-');
                }
            }
            // rysuj pliki
            for(let file of this.ls)
            {
                if(file.type === 1){
                    this.RysujPlik(file.name, file.size+"B");
                }
            }
        }
        catch
        {
            console.error("Problemy z połączeniem! - Nie można pobrać listy plików.")
        }
        // zmieniamy wartosc lokalizacji
        $('#path')[0].value = this.path;

        // sprawdzam czy mozna wyswietlic przycisk cofnij
        if(this.path !== "/")
        {
            $("#back").css("display","block")
        }
        else
        {
            $("#back").css("display", "none")
        }
    }

    //--------
    // pliki

    PobierzPlik = (nazwa)=>{
       // location.href="/download?url="+this.path+"&filename="+nazwa;    
       window.open("/download?url="+this.path+"&filename="+nazwa, '_blank');
    }
    
    UsunPlik = async(nazwa)=>
    {
        const path = this.path+nazwa;
        $.ajax({ url: '/data'+"?path="+path+"&type=1", method: "DELETE" })
            .then((data)=> {             
                this.PrzeladujPozycje();
                this.Success(data.msg);
                client.socket.emit('postDeleteFile', {name:nazwa, url: client.path, user: client.nick});         
            })
            .catch((err)=> {
                console.error('Nie udało się usunąć pliku\t'+nazwa);
                this.Error('Nie udało się usunąć pliku\t'+nazwa+" . Ten plik nie istnieje.");
            });
    }
    
    RysujPlik = (nazwa, rozmiar)=>{
        let tr = document.createElement('tr');
        //typ
        let td1 = document.createElement('td');
        let figure1 = document.createElement('figure');
        let img1 = document.createElement('img');
        img1.src="/home/img/file.png";
        img1.alt=""; 
        img1.title="Plik";
        figure1.appendChild(img1);
        td1.appendChild(figure1);
        //nazwa
        let td2 = document.createElement('td');
        td2.innerText=nazwa;
        //rozmiar
        let td3 = document.createElement('td');
        td3.innerText=rozmiar;
        //operacje
        let td4 = document.createElement('td');
        let figure2 = document.createElement('figure');
        figure2.onclick = function(){
            client.PobierzPlik(this.parentElement.parentElement.children[1].innerText);
        }
        let img2 = document.createElement('img');
        img2.src="/home/img/file-download.png";
        img2.alt = "";
        img2.title = "Pobierz";
        figure2.appendChild(img2);
        let figure3 = document.createElement('figure');
        figure3.onclick = function(){
            client.UsunPlik(this.parentElement.parentElement.children[1].innerText);
        }
        let img3 = document.createElement('img');
        img3.src="/home/img/file-delete.png";
        img3.alt = "";
        img3.title = "Usuń";
        figure3.appendChild(img3);

        let figure4 = document.createElement('figure');
        figure4.onclick = function()
        {
            client.ZmienNazwe(this.parentElement.parentElement.children[1].innerText);
        }
        let img4 = document.createElement('img');
        img4.src="/home/img/rename.png";
        img4.title="Zmień nazwę";
        img4.alt="";
        figure4.appendChild(img4);

        td4.appendChild(figure2);
        td4.appendChild(figure3);
        td4.appendChild(figure4);
        //dodanie wszystkiego do TR
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        //Wyswietlenie na ekranie
        $('#ftp_list')[0].appendChild(tr);
    }

    //-------
    // foldery
    RysujFolder = (nazwa, rozmiar, prepend)=>{
        let tr = document.createElement('tr');
        //typ
        let td1 = document.createElement('td');
        let figure1 = document.createElement('figure');
        let img1 = document.createElement('img');
        img1.src="/home/img/folder.png";
        img1.alt=""; 
        img1.title="Folder";
        figure1.appendChild(img1);
        td1.appendChild(figure1);
        //nazwa
        let td2 = document.createElement('td');
        td2.innerText=nazwa;
        //rozmiar
        let td3 = document.createElement('td');
        td3.innerText=rozmiar;
        //operacje
        let td4 = document.createElement('td');
        let figure2 = document.createElement('figure');
        figure2.onclick = function(){
            client.Przejdz(this.parentElement.parentElement.children[1].innerText);
        }
        let img2 = document.createElement('img');
        img2.src="/home/img/open.png";
        img2.alt = "";
        img2.title = "Otwórz";
        figure2.appendChild(img2);
        td4.appendChild(figure2);

        let figure3 = document.createElement('figure');
        figure3.onclick = function()
        {
            client.UsunFolder(this.parentElement.parentElement.children[1].innerText);
        }
        let img3 = document.createElement('img');
        img3.src="/home/img/folder-delete.png";
        img3.title="Usuń";
        img3.alt="";
        figure3.appendChild(img3);
        td4.appendChild(figure3);


        let figure4 = document.createElement('figure');
        figure4.onclick = function()
        {
            client.ZmienNazwe(this.parentElement.parentElement.children[1].innerText);
        }
        let img4 = document.createElement('img');
        img4.src="/home/img/rename.png";
        img4.title="Zmień nazwę";
        img4.alt="";
        figure4.appendChild(img4);
        td4.appendChild(figure4);

        //dodanie wszystkiego do TR
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        //Wyswietlenie na ekranie
        if(prepend)
        {
            $('#ftp_list')[0].prepend(tr);
        }else
        {
            $('#ftp_list')[0].appendChild(tr);
        }

    }
    
    DodajFolder = async()=>{
    
        var folderName = prompt("Podaj nazwę folderu:", "");
        if(folderName)
        {
            try
            {
                const response =  await $.post('/data',{task:2, url:this.path, folder:{name:folderName}});
                this.Success(response.msg);
                client.socket.emit('postNewFolder', {name:folderName, size: '-', url: client.path, user: client.nick});
                this.PrzeladujPozycje();
            }
            catch(e)
            {
                this.Error(e.responseJSON.msg);
            }
        }
        else
        {
            this.Error("Nazwa katalogu nie może być pusta.")
        }
    }

    UsunFolder = async(nazwa)=>
    {
        if (confirm('Napewno chcesz usunąć folder '+nazwa+"?")) 
        {
            const path = this.path+nazwa;
            $.ajax({ url: '/data'+"?path="+path+"&type=2", method: "DELETE" })
                .then((data)=> {             
                    this.PrzeladujPozycje();
                    this.Success(data.msg);
                    client.socket.emit('postDeleteFolder', {name:nazwa, url: client.path, user: client.nick});     
                })
                .catch((err)=> {
                    console.error('Nie udało się usunąć folderu\t'+nazwa);
                    this.Error('Nie udało się usunąć folderu\t'+nazwa+" . Ten folder nie istnieje.");
                });
        }  
    }

    ZmienNazwe = (nazwa)=>
    {
        let newName = prompt("Podaj nową nazwę:", "");
        if(newName)
        {
            let path = this.path;
            $.ajax({ url: '/data'+"?path="+path+"&oldName="+nazwa+"&newName="+newName, method: "PATCH" })
            .then((data)=> {             
                this.Success(data.msg);
                client.socket.emit('postRename', {oldName:nazwa,newName:newName, url: client.path, user: client.nick});     
            })
            .catch((err)=> {
                console.error(err);
                this.Error('Nie udało się zmienić nazwy na\t'+nazwa+" .");
            });
        }else{
            alert("Akcja anulowana.");
        }
    }

    //Powiadomienia
    Success = (msg)=>
    {
        let div =   `<div class="alert alert-success alert-dismissible"">
                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                        <strong>Sukces! </strong>`+msg+`
                    </div>`
        $("#notify").append(div);
    }

    Error=(msg)=>{
        let div =   `<div class="alert alert-danger alert-dismissible"">
                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                        <strong>Błąd! </strong>`+msg+`
                    </div>`
        $("#notify").append(div);
    }

    // wyloguj
    Wyloguj = async ()=>{
        await $.post('/logout');
        location.reload();
    }

    
}

const client = new Client();
client.init();



// listeners

$("#add_file").on('change', function()
{
    var reader = new FileReader();
    reader.onloadend = async (e)=> 
    {
        let filename = $("#add_file")[0].files[0].name;
        let tmp = e.target.result.toString('base64').split('base64')[1];
        let packet = 
        {
            url:client.path, 
            task: 1, 
            file:
            {
                name: filename, 
                bytes: tmp
            }
        }

        try
        {
            const response = await $.post('/data', packet);
            client.Success(response.msg);
            client.socket.emit('postNewFile', {name:filename, size: e.total, url: client.path, user: client.nick});
            client.PrzeladujPozycje();
        }
        catch
        {
            client.Error(e.responseJSON.msg);
            //console.error(e.responseJSON.msg);         
        }
    }
    reader.readAsDataURL(this.files[0]);
});


// usuwa element z tabeli o podanej nazwie
const removeFromList = (name)=>
{
    let parent = $("#ftp_list")[0];
    let children = parent.children;
    for(let child of children)
    {
        if(child.children[1].innerText === name)
        {
            child.remove();
            break;
        }
    }
}

// gniazda

client.socket.on('disconnect', ()=>
{
    location.reload();
})

// pobiera liczbe aktywnych userow
client.socket.on('active', (data) => {
    $("#active")[0].innerText = data;
});

// jesli pojawil sie nowy plik to...
client.socket.on('getNewFile', (data)=>
{
    if(client.path === data.url && data.user !== client.nick)
    {
        client.RysujPlik(data.name, data.size);
    }
});

// jesli pojawil sie nowy folder to...
client.socket.on('getNewFolder', (data)=>{
    if(client.path === data.url && data.user !== client.nick)
    {
        console.log("Rysuje folder")
        client.RysujFolder(data.name, data.size, true);
    }
});

// jestli plik zostal usuniety to...
client.socket.on('getDeleteFile', (data)=>{
    if(client.path === data.url && data.user !== client.nick)
    {
        removeFromList(data.name);
    }
});

// jestli folder zostal usuniety to...
client.socket.on('getDeleteFolder', (data)=>{
    if(client.path === data.url && data.user !== client.nick)
    {
        removeFromList(data.name);
    }
    else
    {
        // jezeli jestesmy w tym folderze to wracamy na poczatek
        if(client.history.includes(data.url)){
            location.reload();
        }
    }
});

client.socket.on('getRename', (data)=>{
    if(client.path === data.url)
    {
        console.log(data);
        let parent = $("#ftp_list")[0];
        let children = parent.children;
        for(let child of children)
        {
            if(child.children[1].innerText === data.oldName)
            {
                child.children[1].innerText = data.newName;
                break;
            }
        }
    }
    else
    {
        // jezeli jestesmy w tym folderze to wracamy na poczatek
        if(client.history.includes(data.url)){
            location.reload();
        }
    }
});

