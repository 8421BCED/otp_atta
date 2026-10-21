$user = [System.Environment]::ExpandEnvironmentVariables([Environment]::GetEnvironmentVariable('Path', 'User'))
$machine = [System.Environment]::ExpandEnvironmentVariables([Environment]::GetEnvironmentVariable('Path', 'Machine'))
$env:Path = "$user;$machine"

Set-Location "c:\Users\0dani\Desktop\otp_att\server"
node index.js
