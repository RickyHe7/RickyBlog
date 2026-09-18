<#
.SYNOPSIS
    线上自检：给定一个站点根地址，逐条核对页面可达性、SEO 产物与 Pagefind 搜索索引。

.DESCRIPTION
    部署到 Cloudflare Pages 之后跑一次，确认：
      1. 所有页面返回 200、404 页确实返回 404
      2. canonical / robots.txt / sitemap / rss 里的绝对地址用的是你给的域名（不是占位或别人的域名）
      3. Pagefind 的索引资源真的部署上去了（决定线上搜索能不能用）
      4. 站点确实是这个博客，而不是恰好同名的别人的站

.EXAMPLE
    .\scripts\check-live.ps1 -Base https://your-project.pages.dev

.NOTES
    全程用 Write-Output 而不是 Write-Host：Write-Host 不走输出流，用 *> 重定向抓不到内容。
    末尾刻意不写 exit：exit 会连调用它的 PowerShell 会话一起结束。
#>

param(
    [Parameter(Mandatory = $true, HelpMessage = "站点根地址，例如 https://your-project.pages.dev")]
    [string]$Base
)

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Base = $Base.TrimEnd('/')

$failures = New-Object System.Collections.ArrayList

function Get-Page {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 25 -MaximumRedirection 5
        return [pscustomobject]@{
            Ok      = ($r.StatusCode -eq 200)
            Status  = [string]([int]$r.StatusCode)
            Content = $r.Content
        }
    } catch {
        $code = 'ERR'
        if ($_.Exception.Response) {
            try { $code = [string]([int]$_.Exception.Response.StatusCode) } catch { $code = 'ERR' }
        }
        return [pscustomobject]@{ Ok = $false; Status = $code; Content = '' }
    }
}

function Report {
    param([bool]$Pass, [string]$Label, [string]$Detail)
    if ($Pass) {
        Write-Output ("  OK    {0,-42} {1}" -f $Label, $Detail)
    } else {
        Write-Output ("  FAIL  {0,-42} {1}" -f $Label, $Detail)
        [void]$failures.Add($Label)
    }
}

function Warn {
    param([string]$Label, [string]$Detail)
    Write-Output ("  WARN  {0,-42} {1}" -f $Label, $Detail)
}

Write-Output ""
Write-Output "站点自检 : $Base"
Write-Output ""

# ---------------------------------------------------------------- 1. 页面可达性
Write-Output "[1/4] 页面可达性"
$routes = @(
    '/', '/posts/', '/posts/hello-markdown/', '/posts/astro-content-schema/',
    '/posts/astro-search-comparison/', '/search/', '/tags/', '/tags/Astro/',
    '/categories/', '/categories/技术/', '/archives/', '/about/',
    '/projects/', '/links/', '/uses/', '/now/', '/newsletter/',
    '/rss.xml', '/sitemap-index.xml', '/robots.txt',
    '/favicon.svg', '/avatar.svg', '/og-default.png',
    '/pagefind/pagefind.js', '/pagefind/pagefind-ui.css'
)
foreach ($p in $routes) {
    $res = Get-Page ($Base + $p)
    Report $res.Ok $p ("HTTP " + $res.Status)
}

# ---------------------------------------------------------------- 2. 404
Write-Output ""
Write-Output "[2/4] 404 页"
$bogus = Get-Page ($Base + '/no-such-page-xyz')
$has404 = ($bogus.Status -eq '404')
Report $has404 '/no-such-page-xyz 应返回 404' ("HTTP " + $bogus.Status)
if ($has404) {
    # 只是提醒，不算失败：返回哪个 404 页面由托管方决定。
    # Cloudflare Pages 会返回我们的 dist/404.html；
    # 而 astro preview 有自己的默认 404 响应体，所以本地预览下这项通常是 WARN。
    $isOurs = ($bogus.Content -match '404') -and ($bogus.Content -match 'Ricky')
    if ($isOurs) {
        Report $true '404 页是我们自定义的那一版' '含站点标识'
    } else {
        Warn '返回的是托管方默认 404（非致命）' 'Cloudflare Pages 会用我们的 dist/404.html'
    }
}

# ---------------------------------------------------------------- 3. 站点身份与绝对地址
Write-Output ""
Write-Output "[3/4] 站点身份与绝对地址"
$homePage = Get-Page ($Base + '/')
$hasMarker = ($homePage.Content -match 'indexCard')
Report $hasMarker '首页含 #indexCard（确实是本站）' $(if ($hasMarker) { 'found' } else { '未找到 —— 这个地址可能不是你的站！' })

$canonical = ([regex]::Match($homePage.Content, 'rel="canonical" href="([^"]+)"')).Groups[1].Value
Report ($canonical -eq "$Base/") '首页 canonical 用真实域名' $(if ($canonical) { $canonical } else { '(没抓到 canonical)' })

$robots = (Get-Page ($Base + '/robots.txt')).Content
$sitemapLine = ([regex]::Match($robots, 'Sitemap:\s*(\S+)')).Groups[1].Value
Report ($sitemapLine -eq "$Base/sitemap-index.xml") 'robots.txt 的 Sitemap 指向本站' $(if ($sitemapLine) { $sitemapLine } else { '(没抓到 Sitemap 行)' })

$rss = (Get-Page ($Base + '/rss.xml')).Content
Report ($rss -match 'hello-markdown') 'RSS 含示例文章' $(if ($rss -match 'hello-markdown') { 'found' } else { 'RSS 里没有文章' })

# ---------------------------------------------------------------- 4. 搜索索引
Write-Output ""
Write-Output "[4/4] 搜索索引（决定线上搜索能不能用）"
$entry = Get-Page ($Base + '/pagefind/pagefind-entry.json')
Report $entry.Ok '/pagefind/pagefind-entry.json' ("HTTP " + $entry.Status)
$pfJs = Get-Page ($Base + '/pagefind/pagefind.js')
Report ($pfJs.Ok -and $pfJs.Content.Length -gt 1000) '/pagefind/pagefind.js 有内容' ($pfJs.Content.Length.ToString() + ' bytes')

# ---------------------------------------------------------------- 汇总
Write-Output ""
if ($failures.Count -eq 0) {
    Write-Output "全部通过 ✅"
} else {
    Write-Output ("有 {0} 项未通过：" -f $failures.Count)
    foreach ($f in $failures) { Write-Output ("  - " + $f) }
    Write-Output ""
    Write-Output "常见原因："
    Write-Output "  1. SITE_URL 没设 → canonical / sitemap / robots 会指向占位域名"
    Write-Output "  2. 在 Cloudflare 改完环境变量但没重新部署 → 值是构建期内联进 HTML 的"
    Write-Output "  3. NODE_VERSION 不是 22 → 构建失败，去 Pages 的构建日志里看"
}
Write-Output ""
