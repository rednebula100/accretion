param([string]$Message = 'Publish current ACCRETION game')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
$previousIndex = $env:GIT_INDEX_FILE
$publicationIndex = Join-Path ([IO.Path]::GetTempPath()) ('accretion-index-' + [guid]::NewGuid())
function Invoke-GitChecked {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    $result = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments[0]) failed" }
    return $result
}
try {
    # Publish only game files, without private design snapshots or local history.
    $env:GIT_INDEX_FILE = $publicationIndex
    Invoke-GitChecked read-tree --empty
    Invoke-GitChecked add -- .github src public scripts tests .gitattributes .gitignore index.html package.json package-lock.json vite.config.js README.md THIRD_PARTY_NOTICES.md
    $tree = Invoke-GitChecked write-tree
    $parent = & git rev-parse --verify --quiet refs/heads/github-pages-source
    if ($LASTEXITCODE -eq 0) {
        $commit = Invoke-GitChecked commit-tree $tree -p $parent -m $Message
    } else {
        $commit = Invoke-GitChecked commit-tree $tree -m $Message
    }
    Invoke-GitChecked update-ref refs/heads/github-pages-source $commit
    Invoke-GitChecked push origin refs/heads/github-pages-source:refs/heads/main
} finally {
    $env:GIT_INDEX_FILE = $previousIndex
    if (Test-Path -LiteralPath $publicationIndex) { Remove-Item -LiteralPath $publicationIndex }
    Pop-Location
}
