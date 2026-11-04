$iconSvg = Get-Content src/public/images/curvednebula-cn-horizontal-icon.svg -Raw
$iconSvg = $iconSvg.Replace('  <defs>', '  <circle cx="128" cy="128" r="126" fill="#FFFFFF"/>' + [Environment]::NewLine + '  <defs>')
[IO.File]::WriteAllText((Join-Path $PWD 'src/public/favicon.svg'),$iconSvg)
Add-Type -AssemblyName System.Drawing
$sourceIcon = [Drawing.Image]::FromFile("$PWD/src/public/images/curvednebula-cn-horizontal-icon.png")
$sizes = @(16,32,48,64,256)
$streams = @()
foreach ($size in $sizes) {
  $bitmap = [Drawing.Bitmap]::new($size,$size)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $circleInset = $size / 128.0
  $graphics.FillEllipse([Drawing.Brushes]::White,[single]$circleInset,[single]$circleInset,[single]($size-2*$circleInset),[single]($size-2*$circleInset))
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($sourceIcon,0,0,$size,$size)
  $stream = [IO.MemoryStream]::new()
  $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
  $streams += ,$stream.ToArray()
  if ($size -eq 256) { $bitmap.Save("$PWD/tmp/favicon-circle-preview.png",[Drawing.Imaging.ImageFormat]::Png) }
  if ($size -eq 32) { $bitmap.Save("$PWD/src/public/favicon-32x32.png",[Drawing.Imaging.ImageFormat]::Png) }
  $graphics.Dispose();$bitmap.Dispose();$stream.Dispose()
}
$sourceIcon.Dispose()
$writer = [IO.BinaryWriter]::new([IO.File]::Create("$PWD/src/public/favicon.ico"))
$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i=0; $i -lt $sizes.Count; $i++) {
  $dimension = $sizes[$i] % 256
  $writer.Write([byte]$dimension);$writer.Write([byte]$dimension)
  $writer.Write([byte]0);$writer.Write([byte]0)
  $writer.Write([uint16]1);$writer.Write([uint16]32)
  $writer.Write([uint32]$streams[$i].Length);$writer.Write([uint32]$offset)
  $offset += $streams[$i].Length
}
foreach ($bytes in $streams) { $writer.Write([byte[]]$bytes) }
$writer.Dispose()
