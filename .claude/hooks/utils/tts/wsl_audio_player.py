#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = []
# ///

"""
WSL Audio Player - Plays audio files using Windows native player

This script provides a workaround for WSL2 audio issues by using
Windows' native audio capabilities through explorer.exe or PowerShell.
"""

import sys
import os
import subprocess
import tempfile
from pathlib import Path


def play_audio_file_windows(audio_path):
    """Play an audio file using Windows native capabilities from WSL."""
    
    # Convert WSL path to Windows path
    wsl_path = Path(audio_path).absolute()
    
    # Method 1: Use wslpath if available
    try:
        result = subprocess.run(
            ["wslpath", "-w", str(wsl_path)],
            capture_output=True,
            text=True,
            check=True
        )
        windows_path = result.stdout.strip()
    except:
        # Fallback: Manual conversion
        # Assumes default WSL mount point
        windows_path = str(wsl_path).replace("/mnt/c", "C:")
        windows_path = windows_path.replace("/", "\\")
    
    print(f"🎵 Playing: {audio_path}")
    print(f"🪟 Windows path: {windows_path}")
    
    # Try multiple methods to play audio
    methods = [
        # Method 1: PowerShell with Windows Media Player
        [
            "powershell.exe", "-Command",
            f"(New-Object Media.SoundPlayer '{windows_path}').PlaySync()"
        ],
        
        # Method 2: PowerShell with .NET
        [
            "powershell.exe", "-Command",
            f"Add-Type -AssemblyName presentationCore; " +
            f"$player = New-Object System.Windows.Media.MediaPlayer; " +
            f"$player.Open('{windows_path}'); " +
            f"$player.Play(); " +
            f"Start-Sleep -Seconds 5"
        ],
        
        # Method 3: Windows Media Player directly
        ["cmd.exe", "/c", f"start /wait wmplayer.exe \"{windows_path}\""],
        
        # Method 4: Default system player
        ["cmd.exe", "/c", f"start /wait \"\" \"{windows_path}\""],
    ]
    
    for i, method in enumerate(methods, 1):
        try:
            print(f"🔧 Trying method {i}...")
            subprocess.run(method, check=True, capture_output=True)
            print("✅ Audio played successfully!")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Method {i} failed: {e}")
            continue
    
    print("❌ All playback methods failed")
    print("💡 Try opening the file manually in Windows Explorer")
    
    # As last resort, open containing folder
    try:
        folder = str(Path(audio_path).parent)
        subprocess.run(["explorer.exe", "."], cwd=folder)
        print(f"📁 Opened folder: {folder}")
    except:
        pass
    
    return False


def save_and_play_text(text):
    """For testing: Create a simple beep/tone and play it."""
    
    # Create a simple WAV file with a beep
    import wave
    import math
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    
    # Generate a simple sine wave beep
    sample_rate = 44100
    duration = 0.5  # seconds
    frequency = 440  # A4 note
    
    with wave.open(tmp_path, 'w') as wav:
        wav.setnchannels(1)  # mono
        wav.setsampwidth(2)  # 2 bytes per sample
        wav.setframerate(sample_rate)
        
        # Generate sine wave
        for i in range(int(sample_rate * duration)):
            value = int(32767 * math.sin(2 * math.pi * frequency * i / sample_rate))
            wav.writeframes(value.to_bytes(2, 'little', signed=True))
    
    print(f"🎵 Generated test beep: {tmp_path}")
    play_audio_file_windows(tmp_path)
    
    # Clean up
    try:
        os.unlink(tmp_path)
    except:
        pass


def main():
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        if os.path.exists(audio_file):
            play_audio_file_windows(audio_file)
        else:
            print(f"❌ File not found: {audio_file}")
            print("💡 Generating test beep instead...")
            save_and_play_text("test")
    else:
        print("WSL Audio Player")
        print("================")
        print("Usage:")
        print("  ./wsl_audio_player.py <audio_file>")
        print("  ./wsl_audio_player.py  # Plays test beep")
        print("")
        print("Playing test beep...")
        save_and_play_text("test")


if __name__ == "__main__":
    main()