# Script to check if logo files exist and their sizes
Write-Host "Checking logo files in public folder..." -ForegroundColor Cyan
Write-Host ""

$publicPath = "public"
$requiredFiles = @(
    @{Name="og-image.png"; Width=1200; Height=630; Critical=$true},
    @{Name="apple-icon.png"; Width=180; Height=180; Critical=$true},
    @{Name="icon.svg"; Width=0; Height=0; Critical=$true}
)

$allExist = $true

foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $publicPath $file.Name
    $exists = Test-Path $fullPath
    
    if ($exists) {
        $fileInfo = Get-Item $fullPath
        $size = $fileInfo.Length
        $sizeKB = [math]::Round($size / 1KB, 2)
        
        Write-Host "FOUND: $($file.Name)" -ForegroundColor Green
        Write-Host "   Size: $sizeKB KB" -ForegroundColor Gray
        Write-Host "   Last Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
        
        if ($file.Name -like "*.png" -and $file.Width -gt 0) {
            try {
                Add-Type -AssemblyName System.Drawing
                $img = [System.Drawing.Image]::FromFile($fullPath)
                $actualWidth = $img.Width
                $actualHeight = $img.Height
                $img.Dispose()
                
                if ($actualWidth -eq $file.Width -and $actualHeight -eq $file.Height) {
                    Write-Host "   Dimensions: ${actualWidth}x${actualHeight} (Correct)" -ForegroundColor Green
                } else {
                    Write-Host "   Dimensions: ${actualWidth}x${actualHeight} (Expected: $($file.Width)x$($file.Height))" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "   Dimensions: Could not read" -ForegroundColor Yellow
            }
        }
        Write-Host ""
    } else {
        Write-Host "MISSING: $($file.Name)" -ForegroundColor Red
        if ($file.Critical) {
            Write-Host "   CRITICAL - This file is required!" -ForegroundColor Red
        }
        Write-Host ""
        $allExist = $false
    }
}

Write-Host "----------------------------------------" -ForegroundColor Cyan
if ($allExist) {
    Write-Host "All logo files exist!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify the images show your new cloud with crown logo" -ForegroundColor White
    Write-Host "2. Restart your Next.js dev server" -ForegroundColor White
    Write-Host "3. Deploy to production" -ForegroundColor White
    Write-Host "4. Use Facebook Debugger to clear cache" -ForegroundColor White
} else {
    Write-Host "Some files are missing!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Action required:" -ForegroundColor Yellow
    Write-Host "1. Create/replace the missing files with your cloud with crown logo" -ForegroundColor White
    Write-Host "2. See REPLACE-LOGOS-NOW.md for detailed instructions" -ForegroundColor White
}
