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

function CurlJson([string]$url, [hashtable]$headers) {
  # -sS: silent but show errors
  $args = @("-sS", $url)
  foreach ($k in $headers.Keys) {
    # PowerShell: "$k:" tenta resolver "$k:" como "drive scope", então usamos ${k}
    $args += @("-H", "${k}: $($headers[$k])")
  }
  $out = & curl.exe @args
  return $out
}

function Ensure-SupabaseLocalRunning() {
  try {
    & supabase status | Out-Null
  } catch {
    throw "Supabase CLI não encontrado no PATH. Instale e tente novamente (https://supabase.com/docs/guides/cli)."
  }

  $status = & supabase status 2>&1
  if ($status -match "supabase local development setup is running") {
    Info "Supabase local já está rodando."
    return
  }

  Info "Subindo Supabase local..."
  & supabase start | Out-Null
}

function Set-LocalSecrets([hashtable]$secrets) {
  $pairs = @()
  foreach ($k in $secrets.Keys) {
    $v = [string]$secrets[$k]
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      $pairs += "$k=$v"
    }
  }
  if ($pairs.Count -eq 0) { return }

  # aplica secrets no runtime local
  & supabase secrets set --local @pairs | Out-Null
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

  Set-LocalSecrets @{
    VTEX_ACCOUNT = $VTEX_ACCOUNT
    VTEX_ENV = $VTEX_ENV
    VTEX_APP_KEY = $VTEX_APP_KEY
    VTEX_APP_TOKEN = $VTEX_APP_TOKEN
    VTEX_CUSTOMER_CREDIT_ENV = $VTEX_CUSTOMER_CREDIT_ENV
    VTEX_SYNC_SECRET = $syncSecret
  }

  $base = "http://127.0.0.1:65421"
  $url =
    "$base/functions/v1/vtex-sync-clients" +
    "?all=true" +
    "&strategy=$Strategy" +
    "&pageSize=$PageSize" +
    "&withAddress=$([int]$WithAddress.IsPresent)" +
    "&withCredit=$([int]$WithCredit.IsPresent)" +
    "&overwriteCredit=$([int]$OverwriteCredit.IsPresent)" +
    "&concurrency=$Concurrency"

  Info "Chamando local: $url"

  for ($i = 1; $i -le $MaxCalls; $i++) {
    $body = CurlJson $url @{ "x-vtex-sync-secret" = $syncSecret }
    Info "$i) $body"
    if ($body -match '"done"\s*:\s*true') { break }
    Start-Sleep -Seconds $SleepSeconds
  }

  Info "Finalizado no local. Para atualizar a cloud, rode o mesmo script com -Mode cloud (sem precisar migrar CSV)."
  exit 0
}

if ($Mode -eq "cloud") {
  Require-NonEmpty "SUPABASE_ANON_KEY" $SUPABASE_ANON_KEY
  Require-NonEmpty "SUPABASE_ADMIN_JWT" $SUPABASE_ADMIN_JWT

  $url =
    "$SUPABASE_URL/functions/v1/vtex-sync-clients" +
    "?all=true" +
    "&strategy=$Strategy" +
    "&pageSize=$PageSize" +
    "&withAddress=$([int]$WithAddress.IsPresent)" +
    "&withCredit=$([int]$WithCredit.IsPresent)" +
    "&overwriteCredit=$([int]$OverwriteCredit.IsPresent)" +
    "&concurrency=$Concurrency"

  Info "Chamando cloud: $url"
  Info "Obs.: se receber Unauthorized/Forbidden, gere um access_token novo e garanta role admin em public.user_roles."

  for ($i = 1; $i -le $MaxCalls; $i++) {
    $body = CurlJson $url @{
      apikey = $SUPABASE_ANON_KEY
      Authorization = "Bearer $SUPABASE_ADMIN_JWT"
    }
    Info "$i) $body"
    if ($body -match '"done"\s*:\s*true') { break }
    if ($body -match "Unauthorized|Forbidden") { break }
    Start-Sleep -Seconds $SleepSeconds
  }

  Reset-WindowedStateCloud "qhijoyrcbtnqfybuynzy"
  exit 0
}

throw "Invalid Mode: $Mode"

