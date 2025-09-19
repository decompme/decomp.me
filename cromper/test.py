#!/usr/bin/env python3

import requests
import time
import subprocess
import sys
from pathlib import Path

CROMPER_URL = "http://localhost:8888"


def test_cromper_health(silent=False):
    """Test cromper health endpoint."""
    if not silent:
        print("Testing cromper health...")
    try:
        response = requests.get(f"{CROMPER_URL}/health", timeout=5)
        response.raise_for_status()
        data = response.json()
        if not silent:
            print(f"✓ Health check passed: {data}")
        return True
    except Exception as e:
        if not silent:
            print(f"✗ Health check failed: {e}")
        return False


def test_cromper_platforms():
    """Test cromper platforms endpoint."""
    print("Testing cromper platforms...")
    try:
        response = requests.get(f"{CROMPER_URL}/platforms", timeout=5)
        response.raise_for_status()
        data = response.json()
        platforms = data.get("platforms", [])
        if len(platforms) == 0:
            print("✗ No platforms found")
            return False
        print(f"✓ Found {len(platforms)} platforms")
        return True
    except Exception as e:
        print(f"✗ Platforms test failed: {e}")
        return False


def test_cromper_compilers():
    """Test cromper compilers endpoint."""
    print("Testing cromper compilers...")
    try:
        response = requests.get(f"{CROMPER_URL}/compilers", timeout=5)
        response.raise_for_status()
        data = response.json()
        compilers = data.get("compilers", [])
        if len(compilers) == 0:
            print("✗ No compilers found")
            return False
        print(f"✓ Found {len(compilers)} compilers")
        return True
    except Exception as e:
        print(f"✗ Compilers test failed: {e}")
        return False


def test_cromper_libraries():
    """Test cromper libraries endpoint."""
    print("Testing cromper libraries...")
    try:
        response = requests.get(f"{CROMPER_URL}/libraries", timeout=5)
        response.raise_for_status()
        data = response.json()
        libraries = data.get("libraries", [])
        if len(libraries) == 0:
            print("✗ No libraries found")
            return False
        print(f"✓ Found {len(libraries)} libraries")
        return True
    except Exception as e:
        print(f"✗ Libraries test failed: {e}")
        return False


def test_cromper_compile():
    """Test cromper compile endpoint."""
    print("Testing cromper compile...")
    try:
        # Simple test compilation
        data = {
            "compiler_id": "gcc2.8.1sn",
            "compiler_flags": "-O2",
            "code": "int main() { return 0; }",
            "context": "",
            "function": "main",
        }

        response = requests.post(f"{CROMPER_URL}/compile", json=data, timeout=10)
        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            print("✓ Compilation test passed")
            return True
        else:
            print(f"✗ Compilation failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"✗ Compilation test failed: {e}")
        return False


def test_cromper_assemble():
    """Test cromper assemble endpoint."""
    print("Testing cromper assemble...")
    try:
        # Simple test assembly
        data = {
            "platform_id": "n64",
            "asm_data": ".text\nmain:\n    nop\n",
            "asm_hash": "test_hash",
        }

        response = requests.post(f"{CROMPER_URL}/assemble", json=data, timeout=10)
        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            print("✓ Assembly test passed")
            return True
        else:
            print(f"✗ Assembly failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"✗ Assembly test failed: {e}")
        return False


def start_cromper():
    """Start cromper service in background."""
    print("Starting cromper service...")
    cromper_dir = Path(__file__).parent

    try:
        proc = subprocess.Popen(
            ["python3", "-m", "cromper.main"],
            cwd=cromper_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Give it time to start
        time.sleep(3)

        # Check if it's still running
        if proc.poll() is None:
            print("✓ Cromper service started")
            return proc
        else:
            print("✗ Cromper service failed to start")
            return None
    except Exception as e:
        print(f"✗ Failed to start cromper: {e}")
        return None


def main():
    """Main test runner."""
    print("=== Cromper Integration Test ===\n")

    # Try to connect first, if it fails, start cromper
    if not test_cromper_health(silent=True):
        cromper_proc = start_cromper()
        if not cromper_proc:
            print("\n✗ Could not start cromper service")
            return 1

        # Test again after starting
        if not test_cromper_health():
            print("\n✗ Cromper service not responding after startup")
            cromper_proc.terminate()
            return 1
    else:
        cromper_proc = None

    # Run all tests
    tests = [
        test_cromper_platforms,
        test_cromper_compilers,
        test_cromper_libraries,
        test_cromper_compile,
        test_cromper_assemble,
    ]

    passed = 0
    for test in tests:
        if test():
            passed += 1
        print()

    # Clean up
    if cromper_proc:
        cromper_proc.terminate()
        cromper_proc.wait()
        print("Cromper service stopped")

    print(f"=== Results: {passed}/{len(tests)} tests passed ===")
    return 0 if passed == len(tests) else 1


if __name__ == "__main__":
    sys.exit(main())
