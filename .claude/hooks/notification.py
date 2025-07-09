#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-dotenv",
# ]
# ///

import argparse
import json
import os
import sys
import subprocess
import random
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional


def get_tts_script_path():
    """
    Determine which TTS script to use based on available API keys.
    Priority order: ElevenLabs > OpenAI > pyttsx3
    WSL2 detection: Use WSL-friendly scripts when in WSL
    """
    # Get current script directory and construct utils/tts path
    script_dir = Path(__file__).parent
    tts_dir = script_dir / "utils" / "tts"
    
    # Check if running in WSL2
    is_wsl = False
    if os.path.exists("/proc/version"):
        with open("/proc/version", "r") as f:
            if "microsoft" in f.read().lower():
                is_wsl = True
    
    # Check for ElevenLabs API key (highest priority)
    if os.getenv('ELEVENLABS_API_KEY'):
        elevenlabs_script = tts_dir / "elevenlabs_tts.py"
        if elevenlabs_script.exists():
            return str(elevenlabs_script)
    
    # Check for OpenAI API key (second priority)
    if os.getenv('OPENAI_API_KEY'):
        # Use WSL-friendly version if in WSL2
        if is_wsl:
            wsl_script = tts_dir / "openai_tts_wsl.py"
            if wsl_script.exists():
                return str(wsl_script)
        
        openai_script = tts_dir / "openai_tts.py"
        if openai_script.exists():
            return str(openai_script)
    
    # Fall back to pyttsx3 (no API key required)
    pyttsx3_script = tts_dir / "pyttsx3_tts.py"
    if pyttsx3_script.exists():
        return str(pyttsx3_script)
    
    return None


def show_windows_notification(message):
    """Show Windows notification for WSL2 users."""
    # Check if running in WSL2
    is_wsl = False
    if os.path.exists("/proc/version"):
        with open("/proc/version", "r") as f:
            if "microsoft" in f.read().lower():
                is_wsl = True
    
    if not is_wsl:
        return  # Only show Windows notifications in WSL2
    
    try:
        # Get the Windows notifier script
        script_dir = Path(__file__).parent
        notifier_script = script_dir / "utils" / "windows_notifier.py"
        
        if notifier_script.exists():
            # Create notification data
            notification_data = {
                "title": "Claude Code",
                "message": message
            }
            
            # Run the notifier
            subprocess.run(
                ["uv", "run", str(notifier_script)],
                input=json.dumps(notification_data),
                text=True,
                capture_output=True,
                timeout=5
            )
    except:
        pass  # Fail silently


def announce_notification(message_override=None):
    """Announce that the agent needs user input via TTS and Windows notification."""
    # Get engineer name if available
    engineer_name = os.getenv('ENGINEER_NAME', '').strip()
    
    # Create notification message with 30% chance to include name
    if message_override:
        notification_message = message_override
    elif engineer_name and random.random() < 0.3:
        notification_message = f"{engineer_name}, your agent needs your input"
    else:
        notification_message = "Your agent needs your input"
    
    # Show Windows notification first (faster)
    show_windows_notification(notification_message)
    
    # Then play TTS audio
    try:
        tts_script = get_tts_script_path()
        if not tts_script:
            return  # No TTS scripts available
        
        # Call the TTS script with the notification message
        subprocess.run([
            "uv", "run", tts_script, notification_message
        ], 
        capture_output=True,  # Suppress output
        timeout=10  # 10-second timeout
        )
        
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError):
        # Fail silently if TTS encounters issues
        pass
    except Exception:
        # Fail silently for any other errors
        pass


def main():
    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser()
        parser.add_argument('--notify', action='store_true', help='Enable TTS notifications')
        args = parser.parse_args()
        
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Ensure log directory exists
        import os
        log_dir = os.path.join(os.getcwd(), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, 'notification.json')
        
        # Read existing log data or initialize empty list
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []
        
        # Append new data
        log_data.append(input_data)
        
        # Write back to file with formatting
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        # Handle notifications if --notify flag is set
        if args.notify:
            message = input_data.get('message', '')
            
            # Different handling based on message type
            if 'waiting for your input' in message or 'waiting for your response' in message:
                # Full notification with TTS and Windows notification
                announce_notification()
            elif 'permission' in message.lower():
                # Permission requests get both notifications with custom message
                announce_notification("Claude needs your permission")
            elif message and message != 'Claude is waiting for your input':
                # Other messages just get Windows notification (no TTS)
                show_windows_notification(message)
        
        sys.exit(0)
        
    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)

if __name__ == '__main__':
    main()