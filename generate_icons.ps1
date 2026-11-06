Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [string]$sourcePath,
        [string]$destPath,
        [int]$width,
        [int]$height
    )
    $src = [System.Drawing.Image]::FromFile($sourcePath)
    $dest = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $width, $height)
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
}

$source = "C:\Users\0dani\Desktop\otp_att\client\public\brand_logo.png"
Resize-Image -sourcePath $source -destPath "C:\Users\0dani\Desktop\otp_att\client\public\icon-192.png" -width 192 -height 192
Resize-Image -sourcePath $source -destPath "C:\Users\0dani\Desktop\otp_att\client\public\icon-512.png" -width 512 -height 512
Resize-Image -sourcePath $source -destPath "C:\Users\0dani\Desktop\otp_att\client\public\icon-maskable-192.png" -width 192 -height 192
Resize-Image -sourcePath $source -destPath "C:\Users\0dani\Desktop\otp_att\client\public\icon-maskable-512.png" -width 512 -height 512
Resize-Image -sourcePath $source -destPath "C:\Users\0dani\Desktop\otp_att\client\public\apple-touch-icon.png" -width 180 -height 180

Write-Output "Icons generated successfully"

