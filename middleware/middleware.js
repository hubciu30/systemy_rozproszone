const crypto = require('crypto');
const DataBase = require("../class/database");
const fs = require('fs');

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));


exports.islogged = (req, res, next)=>{
    if(req.session.logged){
        next();
    }
    else{
        res.status(401);
        res.redirect('/');
        res.end();
    }
}

exports.auth = async (req, res)=>
{
    if(req.body.login && req.body.haslo)
    {
        const pass = crypto.createHash('md5').update(req.body.haslo).digest('hex');
        const db = new DataBase(config.mysql);
        db.Start();
        try
        {
            const response = await db.Query('SELECT * FROM users WHERE login = ? AND pass = ?', [req.body.login, pass]);
            if(response.result.length === 1)
            {
                if(response.result[0].status === 0)
                {
                    try
                    {
                        let time = Date.now();
                        await db.Query('UPDATE `users` SET `last_login` = ? WHERE `users`.`id` = ?',[time, response.result[0].id]);
                        req.session.logged = true;
                        req.session.ID = response.result[0].id;
                        req.session.login = response.result[0].login;
                        req.session.pass = req.body.haslo;
                        req.session.passHash = response.result[0].pass;
                        req.session.last_login = time;
                        req.session.status = response.result[0].status;

                        res.status(200);
                        res.json({msg:"ok"});
                        res.end();
                    }
                    catch
                    {
                        res.status(500);
                        res.end();
                    }
                }
                else
                {
                    res.status(200);
                    res.json({msg:"Zostałeś zablokowany."});
                    res.end();
                }
            }
            else
            {
                res.status(401);
                res.end();
            }            
        }
        catch
        {
            res.status(500);
            res.end();
        }
        
        db.Stop();
    }
    else
    {
        res.status(401);
        res.end();
    }
}


exports.registration = async (req, res) =>
{
    if(req.body.login && req.body.haslo)
    {
        const pass = crypto.createHash('md5').update(req.body.haslo).digest('hex');
        const db = new DataBase(config.mysql);
        db.Start();
        try
        {
            const response = await db.Query('SELECT * FROM users WHERE login = ?', [req.body.login]);
            if(response.result.length === 0)
            {
                try
                {
                    await db.Query('INSERT INTO `users` (`id`, `login`, `pass`, `last_login`, `status`) VALUES (NULL, ?, ?, ?, 0)',[req.body.login,pass, Date.now()]);
                                     
                    res.status(200);
                    res.json({"msg":"ok"});
                    res.end();
                }
                catch
                {
                    res.status(500);
                    res.end();
                }
            }
            else
            {
                res.status(401);
                res.end();
            }            
        }
        catch
        {
            res.status(500);
            res.end();
        }
        
        db.Stop();
    }
    else
    {
        res.status(400);
        res.end();
    }
}