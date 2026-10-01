param([int]$Port = 5500)

$ErrorActionPreference = 'Stop'
$siteRoot = $PSScriptRoot
$files = @{
    '/index.html' = @('index.html', 'text/html; charset=utf-8')
    '/styles.css' = @('styles.css', 'text/css; charset=utf-8')
    '/app.js' = @('app.js', 'application/javascript; charset=utf-8')
    '/auth.js' = @('auth.js', 'application/javascript; charset=utf-8')
    '/supabase-config.js' = @('supabase-config.js', 'application/javascript; charset=utf-8')
}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)

try {
    $listener.Start()
    Write-Host "Otevri v prohlizeci: http://127.0.0.1:$Port/index.html"
    Write-Host 'Toto okno nech otevrene. Server ukoncis pomoci Ctrl+C.'
    while ($true) {
        $connection = $listener.AcceptTcpClient()
        try {
            $connection.ReceiveTimeout = 3000
            $connection.SendTimeout = 3000
            $stream = $connection.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if (-not $requestLine) { continue }
            $parts = $requestLine.Split(' ')
            $headerBytes = 0
            while ($true) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($line)) { break }
                $headerBytes += $line.Length
                if ($headerBytes -gt 16384) { throw 'Request headers too large.' }
            }
            $badRequest = $parts.Length -ne 3 -or $requestLine.Length -gt 8192
            if (-not $badRequest) {
                $badRequest = $parts[2] -notin @('HTTP/1.0', 'HTTP/1.1') -or -not $parts[1].StartsWith('/')
            }
            $path = if ($badRequest) { '' } else { $parts[1].Split('?')[0] }
            if ($path -eq '/') { $path = '/index.html' }
            $status = '200 OK'
            $contentType = 'text/plain; charset=utf-8'
            $extraHeaders = ''
            if ($badRequest) {
                $status = '400 Bad Request'
                $body = [System.Text.Encoding]::UTF8.GetBytes('Bad request.')
            } elseif ($parts[0] -notin @('GET', 'HEAD')) {
                $status = '405 Method Not Allowed'
                $extraHeaders = "Allow: GET, HEAD`r`n"
                $body = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed.')
            } elseif (-not $files.ContainsKey($path)) {
                $status = '404 Not Found'
                $body = [System.Text.Encoding]::UTF8.GetBytes('Not found.')
            } else {
                $file = $files[$path]
                $body = [System.IO.File]::ReadAllBytes((Join-Path $siteRoot $file[0]))
                $contentType = $file[1]
            }
            $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`n${extraHeaders}Connection: close`r`n`r`n"
            $headerData = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($headerData, 0, $headerData.Length)
            if ($parts[0] -ne 'HEAD') { $stream.Write($body, 0, $body.Length) }
            $stream.Flush()
        } catch {
            Write-Warning $_.Exception.Message
        } finally {
            if ($reader) { $reader.Dispose(); $reader = $null }
            $connection.Dispose()
        }
    }
} finally {
    $listener.Stop()
}
