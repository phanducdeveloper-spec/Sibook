# Chuyen PPTX/PPT/DOCX/DOC/ODT/RTF sang PDF bang Microsoft Office (COM), du phong LibreOffice.
param([Parameter(Mandatory = $true)][string]$Src, [Parameter(Mandatory = $true)][string]$Dst)
$ErrorActionPreference = 'Stop'
$ext = [IO.Path]::GetExtension($Src).ToLowerInvariant()
$ok = $false
try {
  if ($ext -in '.pptx', '.ppt', '.pps', '.ppsx', '.odp') {
    $app = New-Object -ComObject PowerPoint.Application
    try {
      # ReadOnly, Untitled, WithWindow=false
      $p = $app.Presentations.Open($Src, -1, 0, 0)
      try { $p.SaveAs($Dst, 32) } finally { $p.Close() }
      $ok = $true
    } finally {
      if ($app.Presentations.Count -eq 0) { $app.Quit() }
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
    }
  } elseif ($ext -in '.docx', '.doc', '.odt', '.rtf') {
    $app = New-Object -ComObject Word.Application
    $app.Visible = $false
    $app.DisplayAlerts = 0
    try {
      $d = $app.Documents.Open($Src, $false, $true, $false)
      try { $d.ExportAsFixedFormat($Dst, 17) } finally { $d.Close(0) }
      $ok = $true
    } finally {
      if ($app.Documents.Count -eq 0) { $app.Quit() }
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
    }
  }
} catch {
  [Console]::Error.WriteLine('Office: ' + $_.Exception.Message)
}
if (-not $ok) {
  $so = @("$env:ProgramFiles\LibreOffice\program\soffice.exe", "${env:ProgramFiles(x86)}\LibreOffice\program\soffice.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $so) { [Console]::Error.WriteLine('Khong co Microsoft Office hoac LibreOffice de dung ban xem goc'); exit 2 }
  $out = Join-Path ([IO.Path]::GetTempPath()) ('mewbook-lo-' + [guid]::NewGuid())
  New-Item -ItemType Directory $out | Out-Null
  & $so --headless --norestore --convert-to pdf --outdir $out $Src | Out-Null
  $pdf = Get-ChildItem $out -Filter *.pdf | Select-Object -First 1
  if (-not $pdf) { exit 3 }
  Move-Item $pdf.FullName $Dst -Force
  Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
}
if (-not (Test-Path $Dst)) { exit 4 }
exit 0
