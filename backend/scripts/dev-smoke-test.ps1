param(
  [string]$BaseUrl = "http://localhost:5000",
  [string]$PublicPath = "/api/categories",
  [string]$VendorsPath = "/api/vendors?limit=50",
  [string]$TimeoutPath = "/api/vendors?limit=200",
  [switch]$TestTimeout
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Join-Url {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Path
  )

  $trimmedBase = $Base.TrimEnd("/")
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $trimmedBase
  }

  if ($Path.StartsWith("/")) {
    return "$trimmedBase$Path"
  }

  return "$trimmedBase/$Path"
}

function Get-HeaderValue {
  param(
    [Parameter(Mandatory = $false)]$Headers,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if (-not $Headers) {
    return $null
  }

  if ($Headers[$Name]) {
    return [string]$Headers[$Name]
  }

  foreach ($key in $Headers.Keys) {
    if ($key -ieq $Name) {
      return [string]$Headers[$key]
    }
  }

  return $null
}

function Invoke-Endpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $false)][string]$Method = "GET",
    [Parameter(Mandatory = $false)][hashtable]$Headers
  )

  if (-not $Headers) {
    $Headers = @{}
  }

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

  try {
    $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 60 -UseBasicParsing
    $stopwatch.Stop()

    return [pscustomobject]@{
      Ok = $true
      Url = $Url
      Method = $Method
      StatusCode = [int]$response.StatusCode
      Headers = $response.Headers
      DurationMs = [int]$stopwatch.ElapsedMilliseconds
      ErrorMessage = ""
    }
  }
  catch {
    $stopwatch.Stop()

    $statusCode = 0
    $responseHeaders = $null

    if ($_.Exception.Response) {
      if ($_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode.value__
      }

      $responseHeaders = $_.Exception.Response.Headers
    }

    return [pscustomobject]@{
      Ok = $false
      Url = $Url
      Method = $Method
      StatusCode = $statusCode
      Headers = $responseHeaders
      DurationMs = [int]$stopwatch.ElapsedMilliseconds
      ErrorMessage = $_.Exception.Message
    }
  }
}

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][bool]$Passed,
    [Parameter(Mandatory = $true)][string]$Details,
    [Parameter(Mandatory = $false)][ValidateSet("PASS", "FAIL", "INFO")][string]$Level = "PASS"
  )

  $results.Add([pscustomobject]@{
      Name = $Name
      Passed = $Passed
      Details = $Details
      Level = $Level
    }) | Out-Null

  switch ($Level) {
    "PASS" { Write-Host ("[PASS] {0} - {1}" -f $Name, $Details) -ForegroundColor Green }
    "FAIL" { Write-Host ("[FAIL] {0} - {1}" -f $Name, $Details) -ForegroundColor Red }
    default { Write-Host ("[INFO] {0} - {1}" -f $Name, $Details) -ForegroundColor Yellow }
  }
}

Write-Host "Winkget backend dev smoke test" -ForegroundColor Cyan
Write-Host ("Base URL: {0}" -f $BaseUrl)

$health = Invoke-Endpoint -Url (Join-Url -Base $BaseUrl -Path "/api/health")
if ($health.StatusCode -eq 200) {
  Add-Result -Name "Health endpoint" -Passed $true -Details ("status=200 in {0}ms" -f $health.DurationMs)
}
else {
  Add-Result -Name "Health endpoint" -Passed $false -Details ("status={0}; error={1}" -f $health.StatusCode, $health.ErrorMessage) -Level "FAIL"
}

$public = Invoke-Endpoint -Url (Join-Url -Base $BaseUrl -Path $PublicPath)
$publicCacheControl = Get-HeaderValue -Headers $public.Headers -Name "Cache-Control"
if ($public.StatusCode -eq 200 -and $publicCacheControl -match "public,\s*max-age=\d+") {
  Add-Result -Name "Public GET cache header" -Passed $true -Details ("Cache-Control={0}" -f $publicCacheControl)
}
else {
  Add-Result -Name "Public GET cache header" -Passed $false -Details ("status={0}; Cache-Control={1}" -f $public.StatusCode, $publicCacheControl) -Level "FAIL"
}

$authHeaders = @{ Authorization = "Bearer smoke-test-token" }
$authContext = Invoke-Endpoint -Url (Join-Url -Base $BaseUrl -Path $PublicPath) -Headers $authHeaders
$authCacheControl = Get-HeaderValue -Headers $authContext.Headers -Name "Cache-Control"
if ($authContext.StatusCode -eq 200 -and $authCacheControl -match "private,\s*no-store") {
  Add-Result -Name "Auth cache bypass" -Passed $true -Details ("Cache-Control={0}" -f $authCacheControl)
}
else {
  Add-Result -Name "Auth cache bypass" -Passed $false -Details ("status={0}; Cache-Control={1}" -f $authContext.StatusCode, $authCacheControl) -Level "FAIL"
}

$gzipHeaders = @{ "Accept-Encoding" = "gzip" }
$gzipCheck = Invoke-Endpoint -Url (Join-Url -Base $BaseUrl -Path $VendorsPath) -Headers $gzipHeaders
$contentEncoding = Get-HeaderValue -Headers $gzipCheck.Headers -Name "Content-Encoding"
if ($gzipCheck.StatusCode -ne 200) {
  Add-Result -Name "Compression check" -Passed $false -Details ("status={0}; error={1}" -f $gzipCheck.StatusCode, $gzipCheck.ErrorMessage) -Level "FAIL"
}
elseif ($contentEncoding -match "gzip") {
  Add-Result -Name "Compression check" -Passed $true -Details ("Content-Encoding={0}" -f $contentEncoding)
}
else {
  Add-Result -Name "Compression check" -Passed $true -Details "No gzip header observed. Payload may be below compression threshold." -Level "INFO"
}

$vendorsUrl = Join-Url -Base $BaseUrl -Path $VendorsPath
$firstRun = Invoke-Endpoint -Url $vendorsUrl
$secondRun = Invoke-Endpoint -Url $vendorsUrl

if ($firstRun.StatusCode -eq 200 -and $secondRun.StatusCode -eq 200) {
  $deltaMs = $firstRun.DurationMs - $secondRun.DurationMs
  $deltaPct = 0
  if ($firstRun.DurationMs -gt 0) {
    $deltaPct = [math]::Round(($deltaMs * 100.0) / $firstRun.DurationMs, 1)
  }

  Add-Result -Name "In-memory cache warm run" -Passed $true -Details (
    "first={0}ms; second={1}ms; delta={2}ms ({3}%)" -f $firstRun.DurationMs, $secondRun.DurationMs, $deltaMs, $deltaPct
  ) -Level "INFO"
}
else {
  Add-Result -Name "In-memory cache warm run" -Passed $false -Details (
    "firstStatus={0}; secondStatus={1}" -f $firstRun.StatusCode, $secondRun.StatusCode
  ) -Level "FAIL"
}

if ($TestTimeout) {
  $timeoutRun = Invoke-Endpoint -Url (Join-Url -Base $BaseUrl -Path $TimeoutPath)

  if ($timeoutRun.StatusCode -eq 503) {
    Add-Result -Name "Timeout behavior" -Passed $true -Details "Observed status=503 (expected when REQUEST_TIMEOUT_MS is intentionally low)."
  }
  else {
    Add-Result -Name "Timeout behavior" -Passed $false -Details (
      "status={0}. For deterministic timeout testing, restart server with REQUEST_TIMEOUT_MS=50." -f $timeoutRun.StatusCode
    ) -Level "FAIL"
  }
}
else {
  Add-Result -Name "Timeout behavior" -Passed $true -Details "Skipped. Rerun with -TestTimeout after setting REQUEST_TIMEOUT_MS low." -Level "INFO"
}

$passCount = @($results | Where-Object { $_.Level -eq "PASS" -and $_.Passed }).Count
$failCount = @($results | Where-Object { -not $_.Passed }).Count
$infoCount = @($results | Where-Object { $_.Level -eq "INFO" }).Count

Write-Host ""
Write-Host "Summary" -ForegroundColor Cyan
Write-Host ("PASS={0} FAIL={1} INFO={2}" -f $passCount, $failCount, $infoCount)

if ($failCount -gt 0) {
  exit 1
}

exit 0
