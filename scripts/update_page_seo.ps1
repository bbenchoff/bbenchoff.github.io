# Update SEO for Jekyll pages
param (
    [string]$filePath
)

function Get-FileTitle {
    param (
        [string]$content
    )
    
    # Try to get title from front matter
    if ($content -match "title:\s*`"(.*?)`"") {
        return $matches[1]
    }
    
    # Try to get first H1 heading
    if ($content -match "^#\s+(.+)$") {
        return $matches[1]
    }
    
    # Fall back to filename
    return (Split-Path $filePath -Leaf) -replace "\.md$", "" -replace "-", " "
}

function Get-FileDescription {
    param (
        [string]$content
    )
    
    # Try to get description from front matter
    if ($content -match "description:\s*`"(.*?)`"") {
        return $matches[1]
    }
    
    # Try to get first paragraph
    if ($content -match "`n`n([^#\n][^`n]+)") {
        $desc = $matches[1].Trim()
        if ($desc.Length > 160) {
            $desc = $desc.Substring(0, 157) + "..."
        }
        return $desc
    }
    
    return ""
}

function Update-FrontMatter {
    param (
        [string]$content,
        [string]$title,
        [string]$description
    )
    
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

    if ($content -match "^---\s*\r?\n(.*?)\r?\n---\s*\r?\n") {
        # Update existing front matter
        $content = $content -replace "^---\s*\r?\n(.*?)\r?\n---\s*\r?\n", $frontMatter
    }
    else {
        # Add new front matter
        $content = $frontMatter + $content
    }
    
    return $content
}

function Update-ImageTags {
    param (
        [string]$content
    )
    
    # Update image tags that don't have alt text or lazy loading
    $content = $content -replace '!\[(.*?)\]\((.*?)\)(?!\{)', '![$1]($2){: loading="lazy" alt="$1"}'
    
    return $content
}

# Main script
$content = Get-Content $filePath -Raw
$title = Get-FileTitle $content
$description = Get-FileDescription $content

$updatedContent = $content
$updatedContent = Update-FrontMatter $updatedContent $title $description
$updatedContent = Update-ImageTags $updatedContent

Set-Content -Path $filePath -Value $updatedContent -NoNewline

Write-Host "Updated SEO for $filePath"
