"""Quick Claude connectivity check.

Usage::

    # from the hangman directory
    python scripts/test_claude.py "Give me a fun fact about Jupiter for kids."

Optional flags::

    python scripts/test_claude.py "Summarize photosynthesis" --max-tokens 200 --temperature 0.2

The script exits with a non-zero status if the request fails, making it safe for
CI smoke tests later.
"""

from __future__ import annotations

import argparse
import sys

from dotenv import load_dotenv

load_dotenv()

from services.claude_client import ClaudeClient, ClaudeClientError


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ping the Claude API using the shared client")
    parser.add_argument("prompt", help="What you want Claude to respond to")
    parser.add_argument("--max-tokens", type=int, default=200, dest="max_tokens")
    parser.add_argument("--temperature", type=float, default=0.3)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        client = ClaudeClient()
    except ValueError as exc:
        print(f"❌ {exc}", file=sys.stderr)
        return 1

    try:
        response = client.generate_text(
            prompt=args.prompt,
            max_tokens=args.max_tokens,
            temperature=args.temperature,
            system=(
                "You are a cheerful K-8 learning coach. Keep answers short, positive, and age-appropriate."
            ),
        )
    except ClaudeClientError as exc:
        print(f"❌ Claude error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - safety net
        print(f"❌ Unexpected error: {exc}", file=sys.stderr)
        return 3
    else:
        print("✅ Claude responded successfully:\n")
        print(response)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
