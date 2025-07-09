#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "openai",
#     "python-dotenv",
# ]
# ///

"""
OpenAI TTS with WSL Auto-Play

This script generates TTS audio using OpenAI and automatically plays it
using the WSL audio player. Perfect for WSL2 environments where direct
audio playback doesn't work.

Usage:
    ./openai_tts_wsl.py                    # Uses default text
    ./openai_tts_wsl.py "Your custom text" # Uses provided text
    ./openai_tts_wsl.py --no-play "Text"   # Save only, don't play
"""

import os
import sys
import asyncio
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv


async def generate_and_play_tts(text, play_audio=True):
    """Generate TTS and automatically play using WSL audio player."""
    
    # Load environment variables
    load_dotenv()
    
    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in environment variables")
        return False
    
    try:
        from openai import AsyncOpenAI
        
        # Initialize OpenAI client
        openai = AsyncOpenAI(api_key=api_key)
        
        print("🎙️  OpenAI TTS with WSL Auto-Play")
        print("=" * 35)
        print(f"🎯 Text: {text}")
        print("🔊 Generating audio...")
        
        # Generate audio
        response = await openai.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="nova",
            input=text,
            instructions="Speak in a cheerful, positive yet professional tone.",
            response_format="mp3",
        )
        
        # Save to temporary file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Use temp directory but with a meaningful name
        temp_dir = Path("/tmp/tts_audio")
        temp_dir.mkdir(exist_ok=True)
        
        filename = f"tts_{timestamp}.mp3"
        audio_path = temp_dir / filename
        
        with open(audio_path, "wb") as f:
            f.write(response.content)
        
        print(f"💾 Audio saved to: {audio_path}")
        
        if play_audio:
            # Get the WSL audio player path
            wsl_player = Path(__file__).parent / "wsl_audio_player.py"
            
            if wsl_player.exists():
                print("🎵 Playing audio via WSL audio player...")
                
                # Run the WSL audio player
                result = subprocess.run(
                    ["uv", "run", str(wsl_player), str(audio_path)],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    print("✅ Playback complete!")
                else:
                    print(f"❌ Playback failed: {result.stderr}")
                    print(f"💡 You can manually play: {audio_path}")
            else:
                print(f"❌ WSL audio player not found at: {wsl_player}")
                print(f"💡 Audio file saved at: {audio_path}")
                # Don't automatically open Explorer - just log the path
        
        return True
        
    except ImportError as e:
        print("❌ Error: Required package not installed")
        print(f"Missing: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def main():
    # Parse command line arguments
    play_audio = True
    args = sys.argv[1:]
    
    if "--no-play" in args:
        play_audio = False
        args.remove("--no-play")
    
    # Get text from remaining arguments or use default
    if args:
        text = " ".join(args)
    else:
        text = "Hello from WSL! Audio playback is working perfectly."
    
    await generate_and_play_tts(text, play_audio)


if __name__ == "__main__":
    asyncio.run(main())