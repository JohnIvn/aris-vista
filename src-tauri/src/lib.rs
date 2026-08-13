use serde::Serialize;
use std::process::Command;

/// GPU stats returned to the frontend.
#[derive(Serialize, Default)]
pub struct GpuStats {
    pub name: String,
    pub vendor: String,
    pub utilization: Option<u32>,
    pub vram_used_mb: Option<u64>,
    pub vram_total_mb: Option<u64>,
    pub temperature_c: Option<u32>,
    /// Set to true when backed by real, queried data (vs. mock/fallback).
    pub real: bool,
}

/// CPU info returned to the frontend.
#[derive(Serialize, Default)]
pub struct CpuStats {
    pub name: String,
    pub utilization: Option<u32>,
    pub cores: Option<u32>,
    /// Set to true when backed by real, queried data.
    pub real: bool,
}

/// RAM info returned to the frontend.
#[derive(Serialize, Default)]
pub struct RamStats {
    pub used_mb: Option<u64>,
    pub total_mb: Option<u64>,
    /// Set to true when backed by real, queried data.
    pub real: bool,
}

/// Combined system stats returned to the frontend.
#[derive(Serialize, Default)]
pub struct SystemStats {
    pub gpu: GpuStats,
    pub cpu: CpuStats,
    pub ram: RamStats,
}

/// Run a PowerShell command and return trimmed stdout on success, else None.
#[cfg(target_os = "windows")]
fn run_powershell(script: &str) -> Option<String> {
    let out = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

/// Windows: query CPU name, live utilization and physical core count.
#[cfg(target_os = "windows")]
fn query_windows_cpu() -> CpuStats {
    let mut stats = CpuStats {
        real: false,
        ..Default::default()
    };

    // CPU name + cores via WMI.
    if let Some(info) = run_powershell(
        "$p = Get-CimInstance Win32_Processor | Select-Object -First 1; '{0}|{1}' -f $p.Name, $p.NumberOfCores",
    ) {
        let mut parts = info.splitn(2, '|');
        if let Some(name) = parts.next() {
            stats.name = name.trim().to_string();
        }
        if let Some(cores) = parts.next() {
            stats.cores = cores.trim().parse().ok();
        }
    }

    // Live CPU usage (percent) via performance counter.
    if let Some(pct) = run_powershell(
        "[math]::Round((Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 1).CounterSamples[0].CookedValue)",
    ) {
        stats.utilization = pct.parse().ok();
    }

    if !stats.name.is_empty() {
        stats.real = true;
    }
    stats
}

/// Windows: query physical and available RAM, derive used bytes.
#[cfg(target_os = "windows")]
fn query_windows_ram() -> RamStats {
    let mut stats = RamStats {
        real: false,
        ..Default::default()
    };

    if let Some(info) = run_powershell(
        "(Get-CimInstance Win32_OperatingSystem | Select-Object -First 1) | ForEach-Object { '{0}|{1}' -f [math]::Round($_.TotalVisibleMemorySize/1024), [math]::Round($_.FreePhysicalMemory/1024) }",
    ) {
        let mut parts = info.splitn(2, '|');
        if let Some(total_mb) = parts.next() {
            stats.total_mb = total_mb.trim().parse().ok();
        }
        if let Some(free_mb) = parts.next() {
            if let Ok(free) = free_mb.trim().parse::<u64>() {
                if let Some(total) = stats.total_mb {
                    stats.used_mb = Some(total.saturating_sub(free));
                }
            }
        }
    }

    if stats.total_mb.is_some() {
        stats.real = true;
    }
    stats
}

/// Try to query an NVIDIA GPU through `nvidia-smi`.
fn query_nvidia() -> Option<GpuStats> {
    let out = Command::new("nvidia-smi")
        .args([
            "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu",
            "--format=csv,noheader,nounits",
        ])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text.lines().next()?;
    // CSV: name, util, mem.used, mem.total, temp
    let cols: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
    if cols.len() < 5 {
        return None;
    }
    Some(GpuStats {
        name: cols[0].to_string(),
        vendor: "NVIDIA".to_string(),
        utilization: cols[1].parse().ok(),
        vram_used_mb: cols[2].parse().ok(),
        vram_total_mb: cols[3].parse().ok(),
        temperature_c: cols[4].parse().ok(),
        real: true,
    })
}

/// Windows fallback: get the display adapter name via WMI/PowerShell.
#[cfg(target_os = "windows")]
fn query_windows_adapter() -> Option<String> {
    let script =
        "Get-CimInstance Win32_VideoController | Select-Object -First 1 -ExpandProperty Name";
    let out = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let name = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}

/// Tauri command that returns real GPU, CPU and RAM statistics.
#[tauri::command]
fn system_stats() -> SystemStats {
    let mut gpu = GpuStats {
        real: false,
        ..Default::default()
    };

    if let Some(stats) = query_nvidia() {
        gpu = stats;
    } else {
        #[cfg(target_os = "windows")]
        {
            if let Some(name) = query_windows_adapter() {
                gpu.name = name;
                gpu.vendor = "Unknown".to_string();
            }
        }
        if gpu.name.is_empty() {
            gpu.name = "GPU unavailable".to_string();
            gpu.vendor = "Unknown".to_string();
        }
    }

    #[cfg(target_os = "windows")]
    let (cpu, ram) = (query_windows_cpu(), query_windows_ram());

    #[cfg(not(target_os = "windows"))]
    let (cpu, ram) = (
        CpuStats {
            name: "CPU unavailable".to_string(),
            real: false,
            ..Default::default()
        },
        RamStats {
            real: false,
            ..Default::default()
        },
    );

    SystemStats { gpu, cpu, ram }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![system_stats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
