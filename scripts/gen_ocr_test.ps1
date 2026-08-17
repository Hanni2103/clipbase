# 生成一张带中文的测试图片（用 Unicode 码点构造中文，纯 ASCII 脚本，避免编码问题）
Add-Type -AssemblyName System.Drawing

# 空气炸锅做脆皮五花肉外酥里嫩
$chars = @(
  0x7A7A, 0x6C14, 0x70B8, 0x9505, 0x505A,
  0x8106, 0x76AE, 0x4E94, 0x82B1, 0x8089,
  0x5916, 0x9165, 0x91CC, 0x5AE9
)
$text = -join ($chars | ForEach-Object { [char]$_ })

$pngPath = Join-Path $PSScriptRoot "..\data\ocr_test.png"
$jsonPath = Join-Path $PSScriptRoot "..\data\ocr_ingest.json"
$dir = Split-Path $pngPath
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$bmp = New-Object System.Drawing.Bitmap(1100, 320)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$font = New-Object System.Drawing.Font("Microsoft YaHei", 48, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::Black
$g.DrawString($text, $font, $brush, 40, 120)
$g.Dispose()
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$bytes = [System.IO.File]::ReadAllBytes($pngPath)
$b64 = [Convert]::ToBase64String($bytes)
$dataUri = "data:image/png;base64,$b64"
$body = @{ user_id = "ocr2"; images = @($dataUri) } | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($jsonPath, $body, (New-Object System.Text.UTF8Encoding($false)))

Write-Output "text drawn: $text"
Write-Output "image bytes: $($bytes.Length)"
