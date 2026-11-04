Add-Type -AssemblyName System.Drawing
function Draw-CnLogo([bool]$dark) {
  $bitmap = [Drawing.Bitmap]::new(2048,2048)
  $g = [Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  if($dark){$g.Clear([Drawing.ColorTranslator]::FromHtml('#242424'))}else{$g.Clear([Drawing.Color]::White)}
  $g.ScaleTransform(8,8)
  $shape = [Drawing.Drawing2D.GraphicsPath]::new()
  $shape.AddLine(176,40,128,40)
  $shape.AddArc(40,40,176,176,270,-180)
  $shape.AddLine(128,216,176,216)
  $shape.AddLine(176,216,176,159)
  $shape.AddLine(176,159,128,159)
  $shape.AddArc(97,97,62,62,90,180)
  $shape.AddLine(128,97,176,97)
  $shape.CloseFigure()
  $g.SetClip($shape)
  $colors = @('#F7B41C','#E76418','#D7596C','#8A4D79','#3973A4','#82BAD9')
  $starts = @(40,71,101,130.5,160,190)
  $heights = @(26,25,24.5,24.5,25,26)
  for($i=0;$i -lt 6;$i++){
    $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($colors[$i]))
    $g.FillRectangle($brush,[single]40,[single]$starts[$i],[single]176,[single]$heights[$i])
    $brush.Dispose()
  }
  $g.ResetClip()
  $ink = if($dark){'#FFFFFF'}else{'#20263F'}
  $star=[Drawing.Drawing2D.GraphicsPath]::new()
  $star.AddBezier(184,106,186,121,191,126,206,128)
  $star.AddBezier(206,128,191,130,186,135,184,150)
  $star.AddBezier(184,150,182,135,177,130,162,128)
  $star.AddBezier(162,128,177,126,182,121,184,106)
  $starTransform=[Drawing.Drawing2D.Matrix]::new(1.7,0,0,1.7,-112.8,-89.6)
  $star.Transform($starTransform)
  $inkBrush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($ink))
  $g.FillPath($inkBrush,$star)
  $inkBrush.Dispose();$starTransform.Dispose();$star.Dispose();$shape.Dispose();$g.Dispose()
  return ,$bitmap
}
foreach ($dark in @($false, $true)) {
  $source = Draw-CnLogo $dark
  $bitmap = [Drawing.Bitmap]::new(512,512)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($source,0,0,512,512)
  $variant = if ($dark) { 'dark' } else { 'white' }
  $bitmap.Save("$PWD/src/public/images/curvednebula-emblem-$variant-512.png",[Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose(); $source.Dispose()
}
