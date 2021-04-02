async function zaloguj()
{
    try
    {
        const response = await $.post('/auth', {login: $("#log_login").val(), haslo: $("#log_haslo").val()});
        if(response.msg === "ok"){
            location.href="home";
        }
        else{
            alert("Twoje konto zostało zablokowane!");
        }
    }
    catch(err)
    {
        if(err.status === 401){
            alert("Złe dane logowania!");
        }
        else{
            alert("Występują problemy z połaczeniem!");
        }
    }
}


async function rejestruj()
{
    try
    {
        const response = await $.post('/registr', {login: $("#rej_login").val(), haslo: $("#rej_haslo").val()});
        $("#log_login").val($("#rej_login").val());
        $("#log_haslo").val($("#rej_haslo").val());
        await zaloguj();         
    }
    catch(err)
    {
        if(err.status === 401){
            alert("Takie konto juz istnieje!");
        }
        else
        {
            alert("Występują problemy z połaczeniem!");
        }
    }
}