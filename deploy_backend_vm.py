#!/usr/bin/env python3
"""
FastAPI Backend Deployer for hotelplus VM
This script packages and deploys the backend service to the remote VM,
installs virtual environment dependencies, and launches uvicorn on port 8080.
"""

import subprocess
import os
import sys

VM = "hotelplus"
REMOTE_DIR = "/home/elif/qr-menu-backend"

def run_cmd(args, msg=None):
    if msg:
        print(f"--> {msg}...")
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error executing command: {' '.join(args)}")
        print(f"Stderr: {result.stderr}")
        sys.exit(1)
    return result.stdout

def main():
    print(f"Starting deployment of FastAPI Backend to VM ({VM})...")

    # 1. Create remote directories
    run_cmd(["ssh", VM, f"mkdir -p {REMOTE_DIR}"], "Creating remote directories on VM")

    # 2. Package and copy backend files
    print("--> Packaging and copying backend source files to VM...")
    subprocess.run(["tar", "-czf", "backend.tar.gz", "-C", "backend", "."], check=True)
    subprocess.run(["scp", "backend.tar.gz", f"{VM}:{REMOTE_DIR}/backend.tar.gz"], check=True)
    run_cmd(["ssh", VM, f"tar -xzf {REMOTE_DIR}/backend.tar.gz -C {REMOTE_DIR}"], "Extracting backend package on VM")

    # Clean up tarballs
    if os.path.exists("backend.tar.gz"):
        os.remove("backend.tar.gz")
    subprocess.run(["ssh", VM, f"rm {REMOTE_DIR}/backend.tar.gz"], capture_output=True)

    # Copy env configuration
    if os.path.exists(".env"):
        print("--> Copying database .env configuration to VM...")
        subprocess.run(["scp", ".env", f"{VM}:{REMOTE_DIR}/.env"], check=True)
    else:
        print("WARNING: No local .env file found to copy.")


    # 3. Setup Virtual environment on VM and install requirements
    setup_cmd = (
        f"cd {REMOTE_DIR} && "
        f"python3 -m venv venv && "
        f"venv/bin/pip install --upgrade pip && "
        f"venv/bin/pip install -r requirements.txt"
    )
    run_cmd(["ssh", VM, setup_cmd], "Setting up Python virtual environment and installing packages on VM")

    # 4. Stop any existing uvicorn processes running on port 8080 to prevent conflicts
    print("--> Stopping any active uvicorn instances on port 8080...")
    subprocess.run(["ssh", VM, "pkill -f uvicorn"], capture_output=True)

    # 5. Start the FastAPI server using nohup to run persistently in the background
    start_cmd = (
        f"cd {REMOTE_DIR} && "
        f"nohup venv/bin/uvicorn main:app --host 0.0.0.0 --port 8080 > uvicorn.log 2>&1 &"
    )
    run_cmd(["ssh", VM, start_cmd], "Starting FastAPI backend server on VM (Port 8080)")

    print("\nDeployment completed successfully!")
    print(f"Backend is running on VM host: http://hotelplus:8080")
    print(f"Logs are tailing at: {REMOTE_DIR}/uvicorn.log on your VM.")

if __name__ == "__main__":
    main()
