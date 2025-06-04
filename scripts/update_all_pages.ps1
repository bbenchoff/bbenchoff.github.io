# Update all pages
$rootPath = "c:\Users\Benchoff\Documents\GitHub\bbenchoff.github.io"
$pageFiles = Get-ChildItem -Path "$rootPath\pages" -Filter "*.md" -Recurse

foreach ($file in $pageFiles) {
    Write-Host "Processing $($file.FullName)..."
    try {
        # Read current content
        $content = Get-Content -Path $file.FullName -Raw
        
        # Extract or generate title
        $title = if ($content -match "title:\s*`"(.*?)`"") {
            $matches[1]
        } elseif ($content -match "^#\s+(.+)$") {
            $matches[1]
        } else {
            $file.BaseName -replace "-", " "
        }
        
        # Extract or generate description
        $description = if ($content -match "description:\s*`"(.*?)`"") {
            $matches[1]
        } elseif ($content -match "`n`n([^#\n][^`n]+)") {
            $desc = $matches[1].Trim()
            if ($desc.Length -gt 160) {
                $desc.Substring(0, 157) + "..."
            } else {
                $desc
            }
        } else {
            "Hardware engineering and PCB design documentation by Brian Benchoff"
        }
        
        # Prepare front matter
        $frontMatter = @"
---
layout: default
title: "$title"
description: "$description"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/default.jpg"
---

"@
        
        # Update content
        $updatedContent = $content
        if ($content -match "^---\s*\r?\n(.*?)\r?\n---\s*\r?\n") {
            $updatedContent = $content -replace "^---\s*\r?\n(.*?)\r?\n---\s*\r?\n", $frontMatter
        } else {
            $updatedContent = $frontMatter + $content
        }
        
        # Update image tags
        $updatedContent = $updatedContent -replace '!\[(.*?)\]\((.*?)\)(?!\{)', '![$1]($2){: loading="lazy" alt="$1"}'
        
        # Write back to file
        Set-Content -Path $file.FullName -Value $updatedContent -NoNewline
        Write-Host "Successfully updated $($file.Name)" -ForegroundColor Green
    }
    catch {
        Write-Host "Error processing $($file.Name): $_" -ForegroundColor Red
    }
}
