# Script to verify testimonial images are in place
Write-Host "Checking for testimonial images in public folder..." -ForegroundColor Cyan

$publicPath = "public"
$requiredImages = @("sarah.jpg", "sarah.jpeg", "sarah.png", "marcus.jpg", "marcus.jpeg", "marcus.png", "jamie.jpg", "jamie.jpeg", "jamie.png")

$found = $false
foreach ($img in $requiredImages) {
    $fullPath = Join-Path $publicPath $img
    if (Test-Path $fullPath) {
        Write-Host "✅ FOUND: $img" -ForegroundColor Green
        $found = $true
        break
    }
}

if (-not $found) {
    Write-Host "❌ NO IMAGES FOUND!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please add these 3 images to the 'public' folder:" -ForegroundColor Yellow
    Write-Host "  1. sarah.jpg (or .jpeg/.png)" -ForegroundColor Yellow
    Write-Host "  2. marcus.jpg (or .jpeg/.png)" -ForegroundColor Yellow
    Write-Host "  3. jamie.jpg (or .jpeg/.png)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Location: $((Get-Location).Path)\public" -ForegroundColor Cyan
}

