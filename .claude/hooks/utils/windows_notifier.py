#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = []
# ///

"""
Windows Notification Utility for WSL2

Shows native Windows notifications that can focus the terminal when clicked.
Designed to work from WSL2 to show notifications on the Windows host.
"""

import sys
import os
import subprocess
import json
import tempfile
from pathlib import Path


def create_powershell_notification_script(title, message, timeout=10):
    """
    Create a PowerShell script that shows a Windows notification with click handler.
    """
    ps_script = f'''
# Load Windows Forms for notifications
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create notification icon
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.Visible = $true

# Create the balloon tip
$notify.BalloonTipTitle = "{title}"
$notify.BalloonTipText = "{message}"
$notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info

# Add click event handler to focus terminal
$notify.add_BalloonTipClicked({{
    # Try to find and activate Windows Terminal
    $terminals = @(
        "WindowsTerminal",
        "wt",
        "Console",
        "ConsoleWindowClass"
    )
    
    $found = $false
    foreach ($terminal in $terminals) {{
        $windows = Get-Process | Where-Object {{$_.MainWindowTitle -like "*$terminal*" -or $_.ProcessName -like "*$terminal*"}}
        if ($windows) {{
            foreach ($window in $windows) {{
                if ($window.MainWindowHandle -ne 0) {{
                    Add-Type @"
                        using System;
                        using System.Runtime.InteropServices;
                        public class Win32 {{
                            [DllImport("user32.dll")]
                            public static extern bool SetForegroundWindow(IntPtr hWnd);
                            [DllImport("user32.dll")]
                            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                        }}
"@
                    [Win32]::ShowWindow($window.MainWindowHandle, 9) # SW_RESTORE
                    [Win32]::SetForegroundWindow($window.MainWindowHandle)
                    $found = $true
                    break
                }}
            }}
            if ($found) {{ break }}
        }}
    }}
    
    # Dispose of the notification
    $notify.Dispose()
}})

# Show the notification
$notify.ShowBalloonTip({timeout * 1000})

# Keep the script running for the timeout duration
Start-Sleep -Seconds {timeout}

# Clean up
$notify.Dispose()
'''
    return ps_script


def show_windows_toast(title, message, timeout=10):
    """
    Show a Windows toast notification using PowerShell's BurntToast module or fallback.
    """
    # Method 1: Try BurntToast module (if installed)
    burnt_toast_script = f'''
    if (Get-Module -ListAvailable -Name BurntToast) {{
        Import-Module BurntToast
        $Button = New-BTButton -Content "Open Claude Code" -Arguments "focus"
        New-BurntToastNotification -Text "{title}", "{message}" -Button $Button -Sound Default
    }} else {{
        # Fallback to basic notification
        [void][System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
        $notification = New-Object System.Windows.Forms.NotifyIcon
        $notification.Icon = [System.Drawing.SystemIcons]::Information
        $notification.BalloonTipIcon = "Info"
        $notification.BalloonTipTitle = "{title}"
        $notification.BalloonTipText = "{message}"
        $notification.Visible = $True
        $notification.ShowBalloonTip({timeout * 1000})
        Start-Sleep -Seconds {timeout}
        $notification.Dispose()
    }}
    '''
    
    try:
        # Execute PowerShell script
        result = subprocess.run(
            ["powershell.exe", "-Command", burnt_toast_script],
            capture_output=True,
            text=True,
            timeout=timeout + 5
        )
        return result.returncode == 0
    except:
        return False


def show_notification(title, message, timeout=10):
    """
    Show a Windows notification from WSL2 with multiple fallback methods.
    """
    
    # Method 1: Try wsl-notify-send if available
    try:
        result = subprocess.run(
            ["wsl-notify-send", "-c", "Claude Code", title, message],
            capture_output=True,
            timeout=5
        )
        if result.returncode == 0:
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    # Method 2: Use PowerShell with click handler
    ps_script = create_powershell_notification_script(title, message, timeout)
    
    # Write script to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ps1', delete=False) as f:
        f.write(ps_script)
        temp_script = f.name
    
    try:
        # Convert WSL path to Windows path
        result = subprocess.run(
            ["wslpath", "-w", temp_script],
            capture_output=True,
            text=True,
            check=True
        )
        windows_script_path = result.stdout.strip()
        
        # Execute the PowerShell script
        subprocess.run(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", windows_script_path],
            capture_output=True,
            timeout=timeout + 5
        )
        
        return True
    except Exception as e:
        print(f"Notification error: {e}", file=sys.stderr)
        return False
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_script)
        except:
            pass
    
    # Method 3: Try toast notification
    return show_windows_toast(title, message, timeout)


def main():
    """Main entry point for testing or direct usage."""
    if len(sys.argv) > 2:
        title = sys.argv[1]
        message = " ".join(sys.argv[2:])
    elif len(sys.argv) > 1:
        title = "Claude Code"
        message = sys.argv[1]
    else:
        # Read from stdin if no arguments
        try:
            data = json.load(sys.stdin)
            title = data.get("title", "Claude Code")
            message = data.get("message", "Notification")
        except:
            title = "Claude Code"
            message = "Your agent needs your input"
    
    print(f"🔔 Showing Windows notification: {title} - {message}")
    
    if show_notification(title, message):
        print("✅ Notification displayed")
    else:
        print("❌ Failed to show notification")
        sys.exit(1)


if __name__ == "__main__":
    main()