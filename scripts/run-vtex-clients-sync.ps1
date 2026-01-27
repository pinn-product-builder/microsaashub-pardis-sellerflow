param(
  [Parameter(Mandatory = $false)]
  [ValidateSet("local", "cloud")]
  [string]$Mode = "local",

  # VTEX (obrigatório no modo local)
  [string]$VTEX_ACCOUNT = "",
  [string]$VTEX_ENV = "vtexcommercestable.com.br",
  [string]$VTEX_APP_KEY = "",
  [string]$VTEX_APP_TOKEN = "",
  [string]$VTEX_CUSTOMER_CREDIT_ENV = "", 

  # Supabase Cloud (obrigatório no modo cloud)
  [string]$SUPABASE_URL = "https://qhijoyrcbtnqfybuynzy.supabase.co",
  [string]$SUPABASE_ANON_KEY = "",
  [string]$SUPABASE_ADMIN_JWT = "",

  # Sync params
  [int]$MaxCalls = 3000,
  [int]$SleepSeconds = 2,
  [int]$PageSize = 200,
  [int]$Concurrency = 2,
  [switch]$WithAddress = $true,
  [switch]$WithCredit = $true,
  [switch]$OverwriteCredit = $false,
  [switch]$L2lOnly = $false,
  [ValidateSet("windowed", "scroll")]
  [string]$Strategy = "windowed"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-NonEmpty([string]$name, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required parameter: $name"
  }
}

function Info([string]$msg) { Write-Host $msg }

function Get-ObjProp([object]$obj, [string]$name, [string]$def = "") {
  if ($null -eq $obj) { return $def }
  $p = $obj.PSObject.Properties[$name]
  if ($null -eq $p) { return $def }
  $v = [string]$p.Value
  if ([string]::IsNullOrWhiteSpace($v)) { return $def }
  return $v
}

function CurlJson([string]$url, [hashtable]$headers) {
  # -sS: silent but show errors
  # --max-time: evita travar indefinidamente se o gateway/edge demorar ou a conexão ficar pendurada
  $args = @("-sS", "--max-time", "180", $url)
  foreach ($k in $headers.Keys) {
    # PowerShell: "$k:" tenta resolver "$k:" como "drive scope", então usamos ${k}
    $args += @("-H", "${k}: $($headers[$k])")
  }
  $out = & curl.exe @args
  return $out
}

function Ensure-SupabaseLocalRunning() {
  if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    throw "Supabase CLI não encontrado no PATH. Instale e tente novamente (https://supabase.com/docs/guides/cli)."
  }

  # O `supabase status` pode escrever avisos em stderr (ex.: 'Stopped services: ...').
  # Com $ErrorActionPreference=Stop isso vira erro fatal. Aqui tratamos como texto e seguimos.
  $oldEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $status = (& supabase status 2>&1 | Out-String)
  $ErrorActionPreference = $oldEap

  if ($status -match "supabase local development setup is running") {
    Info "Supabase local já está rodando."
    return
  }

  Info "Subindo Supabase local..."
  & supabase start | Out-Null
}

function Get-SupabaseStatusJson() {
  # No Windows PowerShell, stderr de comando nativo pode virar NativeCommandError e quebrar com EAP=Stop.
  # Rodamos via cmd.exe e juntamos stderr->stdout no nível do CMD.
  $raw = & cmd.exe /c "supabase status --output json 2>&1"
  $text = ($raw | Out-String).Trim()

  # o CLI às vezes imprime "Stopped services: ..." depois do JSON; extrai o primeiro objeto JSON
  $m = [regex]::Match($text, "\{[\s\S]*?\}")
  if (-not $m.Success) { throw "Não consegui extrair JSON de: supabase status --output json" }
  $jsonText = $m.Value
  try { return ($jsonText | ConvertFrom-Json) } catch { throw "Falha ao parsear supabase status JSON: $($_.Exception.Message)" }
}

function Write-EnvFile([string]$path, [hashtable]$env) {
  $lines = @()
  foreach ($k in $env.Keys) {
    $v = [string]$env[$k]
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      # mantém simples: KEY=VALUE (sem quotes). Se tiver caracteres especiais, funciona na maioria dos casos.
      $lines += "$k=$v"
    }
  }
  $dir = Split-Path -Parent $path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $path -Value $lines -Encoding UTF8
}

function To-DockerHostUrl([string]$url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return $url }
  # Quando a function roda em container (functions serve), 127.0.0.1 aponta para o container, não para sua máquina.
  # No Windows/Mac, use host.docker.internal para acessar serviços no host.
  return ($url -replace "http://127\.0\.0\.1:", "http://host.docker.internal:" -replace "https://127\.0\.0\.1:", "https://host.docker.internal:")
}

function Start-FunctionsServe([string]$envFile) {
  # Sobe a edge runtime local com env vars. Precisa ficar rodando durante o sync.
  # Usamos um processo separado para não travar o loop.
  $args = @("functions", "serve", "vtex-sync-clients", "--no-verify-jwt", "--env-file", $envFile)
  Info "Iniciando: supabase $($args -join ' ')"

  $logDir = Join-Path $PSScriptRoot ".tmp"
  if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
  $logPath = Join-Path $logDir "functions-serve.vtex-sync-clients.log"

  $p = Start-Process -FilePath "supabase" -ArgumentList $args -WindowStyle Minimized -PassThru -RedirectStandardOutput $logPath -RedirectStandardError $logPath

  # Aguarda o runtime subir e imprimir a URL/porta no log.
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    if ($p.HasExited) {
      $tail = ""
      if (Test-Path $logPath) { $tail = (Get-Content $logPath -Tail 80 | Out-String) }
      throw "supabase functions serve encerrou imediatamente (exit=$($p.ExitCode)). Log: `n$tail"
    }
    Start-Sleep -Milliseconds 750
    if (Test-Path $logPath) {
      $txt = (Get-Content $logPath -Tail 200 | Out-String)
      # regex em aspas duplas com \" e ' quebra o parser do PowerShell; mantenha simples e em aspas simples
      if ($txt -match 'http[s]?://\S+') { return @{ LogPath = $logPath } }
      if ($txt -match 'Serving|serve|listening') { return @{ LogPath = $logPath } }
    }
  }

  return @{ LogPath = $logPath }
}

function Resolve-FunctionsBase([string[]]$candidates, [string]$syncSecret) {
  foreach ($base in $candidates) {
    if ([string]::IsNullOrWhiteSpace($base)) { continue }
    $b = $base.TrimEnd("/")
    $probe =
      "$b/vtex-sync-clients" +
      "?all=true&strategy=windowed&pageSize=1&withAddress=0&withCredit=0&overwriteCredit=0&concurrency=1"
    try {
      $resp = CurlJson $probe @{ "x-vtex-sync-secret" = $syncSecret }
      if ($resp -match '"codeVersion"\s*:') { return $b }
    } catch {
      # ignore
    }
  }
  throw "Não consegui encontrar um endpoint de functions válido. Tente fechar processos antigos de 'supabase functions serve' e rode novamente."
}

function Extract-ServeBaseFromLog([string]$logPath) {
  if (-not (Test-Path $logPath)) { return "" }
  $txt = (Get-Content $logPath -Tail 400 | Out-String)
  # tenta achar a primeira URL local impressa pelo serve
  $m = [regex]::Match($txt, "http://(?:127\\.0\\.0\\.1|localhost):(?<port>\\d+)(?<path>/functions/v1)?", "IgnoreCase")
  if (-not $m.Success) { return "" }
  $port = $m.Groups["port"].Value
  $path = $m.Groups["path"].Value
  if ([string]::IsNullOrWhiteSpace($path)) { $path = "/functions/v1" }
  return "http://127.0.0.1:$port$path"
}

function Reset-WindowedStateCloud([string]$projectRef) {
  Info "Dica: para reprocessar do zero no windowed, rode no Supabase SQL Editor:"
  Info "  delete from public.vtex_sync_state where key = 'clients_windowed_state';"
  Info ""
  Info "Obs.: este script não apaga o state automaticamente na cloud (requer SQL Editor)."
}

if ($Mode -eq "local") {
  Require-NonEmpty "VTEX_ACCOUNT" $VTEX_ACCOUNT
  Require-NonEmpty "VTEX_APP_KEY" $VTEX_APP_KEY
  Require-NonEmpty "VTEX_APP_TOKEN" $VTEX_APP_TOKEN

  Ensure-SupabaseLocalRunning

  # segredo para executar o sync local sem depender de sessão/JWT (verify_jwt=false, mas o código exige auth)
  $syncSecret = [guid]::NewGuid().ToString("N")
  Info "Usando VTEX_SYNC_SECRET local (gerado) para executar o sync."

  $st = Get-SupabaseStatusJson
  $apiUrl = Get-ObjProp $st "API_URL" "http://127.0.0.1:65421"
  $functionsUrl = Get-ObjProp $st "FUNCTIONS_URL" ""
  if ([string]::IsNullOrWhiteSpace($functionsUrl)) {
    # fallback: alguns CLIs podem não retornar FUNCTIONS_URL
    $functionsUrl = ($apiUrl.TrimEnd("/") + "/functions/v1")
  }

  $envFile = Join-Path $PSScriptRoot ".tmp\.env.vtex-sync-local"
  Write-EnvFile $envFile @{
    # Supabase local (para upsert no DB com service role)
    SUPABASE_URL = (To-DockerHostUrl($apiUrl))
    SUPABASE_ANON_KEY = (Get-ObjProp $st "ANON_KEY" "")
    SUPABASE_SERVICE_ROLE_KEY = (Get-ObjProp $st "SERVICE_ROLE_KEY" "")

    # VTEX
    VTEX_ACCOUNT = $VTEX_ACCOUNT
    VTEX_ENV = $VTEX_ENV
    VTEX_APP_KEY = $VTEX_APP_KEY
    VTEX_APP_TOKEN = $VTEX_APP_TOKEN
    VTEX_CUSTOMER_CREDIT_ENV = $VTEX_CUSTOMER_CREDIT_ENV

    # Auth bypass local via secret
    VTEX_SYNC_SECRET = $syncSecret
  }

  # garante que a edge function está servindo com o env-file
  $serve = Start-FunctionsServe $envFile

  # O `functions serve` expõe seu próprio endpoint (normalmente :54321), que pode ser diferente do Kong (:65421).
  # Vamos detectar automaticamente qual responde com codeVersion.
  $fromLog = Extract-ServeBaseFromLog ($serve.LogPath)
  $candidates = @(
    $fromLog,
    "http://127.0.0.1:54321/functions/v1",
    "http://localhost:54321/functions/v1",
    $functionsUrl
  )
  $base = Resolve-FunctionsBase $candidates $syncSecret
  $allParam = if ($L2lOnly.IsPresent) { "false" } else { "true" }
  $url =
    "$base/vtex-sync-clients" +
    "?all=$allParam" +
    "&strategy=$Strategy" +
    "&pageSize=$PageSize" +
    "&withAddress=$([int]$WithAddress.IsPresent)" +
    "&withCredit=$([int]$WithCredit.IsPresent)" +
    "&overwriteCredit=$([int]$OverwriteCredit.IsPresent)" +
    "&concurrency=$Concurrency" +
    "&l2lOnly=$([int]$L2lOnly.IsPresent)"

  Info "Chamando local: $url"

  for ($i = 1; $i -le $MaxCalls; $i++) {
    $body = CurlJson $url @{ "x-vtex-sync-secret" = $syncSecret }
    Info "$i) $body"
    if ($body -match '"done"\s*:\s*true') { break }
    Start-Sleep -Seconds $SleepSeconds
  }

  Info "Finalizado no local. Observação: o processo 'supabase functions serve' continua rodando (pode fechar depois)."
  exit 0
}

if ($Mode -eq "cloud") {
  Require-NonEmpty "SUPABASE_ANON_KEY" $SUPABASE_ANON_KEY
  Require-NonEmpty "SUPABASE_ADMIN_JWT" $SUPABASE_ADMIN_JWT

  $allParam = if ($L2lOnly.IsPresent) { "false" } else { "true" }
  $url =
    "$SUPABASE_URL/functions/v1/vtex-sync-clients" +
    "?all=$allParam" +
    "&strategy=$Strategy" +
    "&pageSize=$PageSize" +
    "&withAddress=$([int]$WithAddress.IsPresent)" +
    "&withCredit=$([int]$WithCredit.IsPresent)" +
    "&overwriteCredit=$([int]$OverwriteCredit.IsPresent)" +
    "&concurrency=$Concurrency" +
    "&l2lOnly=$([int]$L2lOnly.IsPresent)"

  Info "Chamando cloud: $url"
  Info "Obs.: se receber Unauthorized/Forbidden, gere um access_token novo e garanta role admin em public.user_roles."

  for ($i = 1; $i -le $MaxCalls; $i++) {
    $body = CurlJson $url @{
      apikey = $SUPABASE_ANON_KEY
      Authorization = "Bearer $SUPABASE_ADMIN_JWT"
    }
    Info "$i) $body"
    if ($body -match '"done"\s*:\s*true') { break }
    if ($body -match 'Unauthorized|Forbidden') { break }
    Start-Sleep -Seconds $SleepSeconds
  }

  Reset-WindowedStateCloud "qhijoyrcbtnqfybuynzy"
  exit 0
}

throw "Invalid Mode: $Mode"

