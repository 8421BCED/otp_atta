Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\0dani\.gemini\antigravity\brain\5ed14f3f-8ece-4755-a490-23706e598e95\.user_uploaded\media_1793767130879_2d0c5879.jpg"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Save($width, $height, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $width, $height)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Resize-Save 192 192 "c:\Users\0dani\Desktop\otp_att\client\public\icon-192.png"
Resize-Save 512 512 "c:\Users\0dani\Desktop\otp_att\client\public\icon-512.png"
Resize-Save 192 192 "c:\Users\0dani\Desktop\otp_att\client\public\icon-192-maskable.png"
Resize-Save 512 512 "c:\Users\0dani\Desktop\otp_att\client\public\icon-512-maskable.png"
Resize-Save 180 180 "c:\Users\0dani\Desktop\otp_att\client\public\apple-touch-icon.png"
Resize-Save 256 256 "c:\Users\0dani\Desktop\otp_att\client\public\brand_logo.png"
Resize-Save 256 256 "c:\Users\0dani\Desktop\otp_att\client\src\assets\brand_logo.png"

$srcImg.Dispose()
Write-Output "App icons successfully created from uploaded image."

