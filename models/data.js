/*
    Model data - dotyczy operacji na plikach ftp
    GET - pobiera listę katalogów i plików z danej sciezki.
    DELETE - usuwa plik
    POST - dodawanie plikow lub folderow

*/

const fs = require('fs');
const ftp = require('../class/ftpclient');
const { Readable } = require('stream');
const utils = require('../utils/utils');

module.exports = (app, config, ApplicationController) =>{
    
    // pobieranie plikow
    app.get('/download', ApplicationController.islogged, async (req,res)=>
    {   
        const clear = (path) => 
        {
            return new Promise ((resolve, reject)=>
            {
                fs.unlink(path, (error)=>
                {
                    if(error)
                    {
                        reject();
                    }
                    else
                    {
                        resolve();
                    }
                });
            })

        }
        try
        {
            const url = req.query.url;
            const filename = req.query.filename;
            const robot = new ftp(config.ftp);
            await robot.connect();
            const temp_path = await robot.download(url+filename, req.session.ID+"_"+filename);
            await robot.disconnect();
            res.download(temp_path, async ()=>{await clear(temp_path);});
            console.log(utils.createLog(req.session.login+" pobiera plik o nazwie "+filename));
        }
        catch
        {
            res.status(500).end();
        }
        //res.redirect('ftp://'+config.ftp.user+':'+config.ftp.password+'@localhost/'+req.query.url);
    });

    // GET
    app.get('/data', ApplicationController.islogged, async (req,res)=>
    {
        const url = req.query.url;
        const robot = new ftp(config.ftp);
        try
        {
            await robot.connect();
            const list = await robot.getList(url);
            await robot.disconnect();
            console.log(utils.createLog(req.session.login+" pobiera listę plików ze ścieżki "+url));
            res.status(200);
            res.json(list);
            res.end();
        }
        catch(e)
        {
            res.status(404).end();
        }
    });

    // DELETE
    app.delete('/data', ApplicationController.islogged, async (req, res)=>
    {
        const url = req.query.path;
        const type = parseInt(req.query.type);
        const robot = new ftp(config.ftp);
        try
        {
            await robot.connect();
            if(type === 1)
            {
                await robot.remove(url);
                await robot.disconnect();
                console.log(utils.createLog(req.session.login+" usuwa plik ze ścieżki "+url));
                res.status(200).json({msg:"Pomyślnie usunięto plik."}).end();
            }
            else if(type === 2)
            {
                await robot.removeDir(url);
                await robot.disconnect();
                console.log(utils.createLog(req.session.login+" usuwa folder o nazwie "+url));
                res.status(200).json({msg:"Pomyślnie usunięto folder."}).end();
            }
            else
            {
                console.log(utils.createLog(req.session.login+" wysłał złe zapytanie związane z usuwaniem danych!"));
                res.status(400).json({msg:"Błąd w zapytaniu."}).end();
            }

        }
        catch
        {
            res.status(404).end();
        }
    });


    //PATCH
    app.patch('/data', ApplicationController.islogged, async (req, res)=>
    {

        let newName = req.query.newName,
            oldName = req.query.oldName,
            path = req.query.path;

        if(newName)
        {
            try
            {
                const robot = new ftp(config.ftp);
                await robot.connect();
                await robot.rename(path, oldName, newName);
                await robot.disconnect();
                console.log(utils.createLog(req.session.login+" zmienił nazwę z "+oldName+ " na "+ newName));
                res.status(200).json({msg:"Udało się zmienić nazwę."}).end();
            }
            catch
            {
                res.status(500).json({msg:"Wystąpił błąd podczas zmiany nazwy."}).end();
            }
        }
        else
        {
            console.log(utils.createLog(req.session.login+" wysłał złe zapytanie dotyczące zmiany nazwy obiektu!"));
            res.status(400).json({msg:"Błąd w zapytaniu."}).end();
        }
        
    });

    // POST
    app.post('/data', ApplicationController.islogged, async (req, res)=>
    {
        /*
            json:
            {
                task : int,  // 1-plik, 2-folder 
                url: "", // lokalizacja
                folder:
                {
                    name: "" // nazwa folderu
                },
                file:
                {
                    name: "", // nazwa pliku
                    bytes:"" // zawartosc pliku
                }
            }
        */
        const isExist = async (ftp, url, name, type) =>
        {
            const ls = await ftp.getList(url);
            for(let item of ls)
            {
                if(item.name === name && item.type === type)
                {
                    return true;
                }
            }
            return false;
        }

        const client_data = req.body;
        switch(parseInt(client_data.task))
        {
            case 1:  // plik
                if(client_data.file.bytes.length > 0 && client_data.file.name)
                {
                    try
                    {
                        const buffer = Buffer.from(client_data.file.bytes, 'base64')
                        const stream = Readable.from(buffer);
                        const robot = new ftp(config.ftp);
                        await robot.connect();
                        const flag = await isExist(robot, client_data.url, client_data.file.name, 1);
                        if(!flag)
                        {
                            await robot.cd(client_data.url);
                            await robot.upload(client_data.file.name, stream);
                            await robot.disconnect();
                            console.log(utils.createLog(req.session.login+" dodał plik o nazwie "+client_data.file.name));
                            res.status(201).json({msg:"Dodano plik\t"+client_data.file.name}); //201-created
                        }
                        else
                        {
                            await robot.disconnect();
                            console.log(utils.createLog(req.session.login+" próbował dodać plik z nazwą która już istnieje."));
                            res.status(409).json({msg:"Taki plik już istnieje."}).end(); //409-conflict
                        }                                          
                    }
                    catch
                    {
                        res.status(500).json({msg: "Wystąpił błąd podczas dodawania pliku."}).end(); // 500-server error
                    }
                }
                else
                {
                    res.status(400).json({msg:"Wysyłanie pustych plików jest niedozwolone."}).end(); //400 - bad request
                }
                break;
            
            case 2: // folder
                const robot = new ftp(config.ftp);
                try
                {
                    await robot.connect();
                    const flag = await isExist(robot, client_data.url, client_data.folder.name, 2);
                    if(!flag)
                    {
                        await robot.cd(client_data.url);
                        await robot.createDir(client_data.folder.name);
                        await robot.disconnect();
                        console.log(utils.createLog(req.session.login+" stworzył nowy katalog o nazwie "+client_data.folder.name));
                        res.status(201).json({msg:"Utworzono folder."}); //201-created
                    }
                    else
                    {
                        await robot.disconnect();
                        console.log(utils.createLog(req.session.login+" próbował dodać folder który już istnieje."));
                        res.status(409).json({msg:"Taki folder już istnieje."}).end(); //409-conflict
                    }
                }
                catch
                {
                    res.status(500).json({msg: "Wystąpił błąd podczas dodawania katalogu."}).end(); // 500-server error
                }
                break;

            default:
                res.status(400).json({msg:"Niepoprawne zapytanie."}).end(); //400 - bad request
                break;
        }
        
    });

}