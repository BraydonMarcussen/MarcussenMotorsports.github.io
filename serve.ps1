$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = if ($args.Count -gt 0) { [int]$args[0] } else { 8000 }
$prefix = "http://localhost:$port/"

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'application/javascript; charset=utf-8'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.mov' = 'video/quicktime'
  '.mp4' = 'video/mp4'
  '.svg' = 'image/svg+xml'
  '.ico' = 'image/x-icon'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Serving $root at $prefix"
Write-Host 'Press Ctrl+C to stop.'

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))

  if ([string]::IsNullOrWhiteSpace($requestPath)) {
    $requestPath = 'index.html'
  }

  $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $requestPath))
  $response = $context.Response

  if (-not $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    $response.StatusCode = 403
    $buffer = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
  } elseif (Test-Path -LiteralPath $filePath -PathType Leaf) {
    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $response.ContentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { 'application/octet-stream' }
    $buffer = [System.IO.File]::ReadAllBytes($filePath)
  } else {
    $response.StatusCode = 404
    $response.ContentType = 'text/plain; charset=utf-8'
    $buffer = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
  }

  $response.ContentLength64 = $buffer.Length
  if ($context.Request.HttpMethod -ne 'HEAD') {
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
  }
  $response.OutputStream.Close()
}
