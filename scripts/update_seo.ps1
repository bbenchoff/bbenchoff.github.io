# Update SEO for Jekyll site
$template = @"
---
layout: default
title: "TITLE"
description: "DESCRIPTION"
keywords: ["hardware", "engineering", "PCB design"]
author: "Brian Benchoff"
date: $(Get-Date -Format "yyyy-MM-dd")
last_modified_at: $(Get-Date -Format "yyyy-MM-dd")
image: "/images/default.jpg"
---

"@

# Get all markdown files
Get-ChildItem -Path . -Filter "*.md" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Check if front matter exists
    if (!($content -match "^---\s*\r?\n")) {
        $newContent = $template + $content
        Set-Content -Path $_.FullName -Value $newContent -NoNewline
    }
    
    # Update image tags
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '!\[(.*?)\]\((.*?)\)', '![$1]($2){: loading="lazy" alt="$1"}'
    Set-Content -Path $_.FullName -Value $content -NoNewline
}

Write-Host "SEO updates complete!"
