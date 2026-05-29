param(
  [string]$MeiliHost = "http://127.0.0.1:7700",
  [string]$ApiKey = "my-secret-key",
  [string]$Index = "winkget-search",
  [string]$BackendUrl = "http://localhost:5000",
  [string]$SearchAdminToken = "my-search-admin-token"
)

$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer $ApiKey"
}

Write-Host "Checking Meilisearch health at $MeiliHost..."
try {
  Invoke-RestMethod -Method Get -Uri "$MeiliHost/health" | Out-Null
} catch {
  Write-Host "Meilisearch is not reachable. Start it first, then re-run this script." -ForegroundColor Yellow
  exit 1
}

Write-Host "Ensuring index '$Index' exists..."
try {
  Invoke-RestMethod -Method Get -Uri "$MeiliHost/indexes/$Index" -Headers $headers | Out-Null
} catch {
  $body = @{ uid = $Index; primaryKey = "id" } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$MeiliHost/indexes" -Headers $headers -Body $body | Out-Null
}

Write-Host "Applying settings..."
$settings = @{
  searchableAttributes = @(
    "productName","vendorName","subcategoryName","categoryName","products","tags","searchableText"
  )
  filterableAttributes = @(
    "type","cities","categorySlug","subcategorySlug","vendorId","vendorStatus","isStoreOpen","rating"
  )
  sortableAttributes = @("rating","reviews","updatedAt")
  rankingRules = @(
    "words","typo","proximity","attribute","sort","exactness"
  )
  typoTolerance = @{
    minWordSizeForTypos = @{ oneTypo = 3; twoTypos = 7 }
  }
  synonyms = @{
    restro = @("restaurant")
    resto = @("restaurant")
    restraunt = @("restaurant")
    resturant = @("restaurant")
    hotle = @("hotel")
    iphon = @("iphone")
    samung = @("samsung")
    electrian = @("electrician")
    beautician = @("beauty")
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Patch -Uri "$MeiliHost/indexes/$Index/settings" -Headers $headers -Body $settings | Out-Null

Write-Host "Settings applied. Triggering backend reindex..."
$reindexHeaders = @{ "x-search-token" = $SearchAdminToken; "Content-Type" = "application/json" }
try {
  Invoke-RestMethod -Method Post -Uri "$BackendUrl/api/search/reindex" -Headers $reindexHeaders | Out-Null
  Write-Host "Reindex requested."
} catch {
  Write-Host "Backend reindex request failed. Make sure backend is running and SEARCH_ADMIN_TOKEN matches." -ForegroundColor Yellow
}

Write-Host "Done."
