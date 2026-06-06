$ErrorActionPreference = 'Stop'

Write-Host "Entering zkp directory..."
cd zkp

Write-Host "Generating dummy powers of tau..."
if (-not (Test-Path "pot12_final.ptau")) {
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    # For CI/automation, we use non-interactive randomness input
    echo "random text 12345" | snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
} else {
    Write-Host "pot12_final.ptau already exists, skipping generation."
}

$circuits = @("age_range", "status_check", "nullifier")

foreach ($circuit in $circuits) {
    Write-Host "============================================="
    Write-Host "Compiling and setting up circuit: $circuit"
    Write-Host "============================================="
    
    # 1. Compile circom
    circom circuits/$circuit.circom --r1cs --wasm --sym

    # 2. Setup Groth16
    snarkjs groth16 setup "$circuit.r1cs" pot12_final.ptau "${circuit}_0000.zkey"
    
    # 3. Contribute to phase 2
    echo "random text $circuit" | snarkjs zkey contribute "${circuit}_0000.zkey" "${circuit}_final.zkey" --name="1st Contributor" -v

    # 4. Copy to Android assets
    Write-Host "Copying ${circuit}_final.zkey to Android assets..."
    if (-not (Test-Path "../android/app/src/main/assets/zkeys")) {
        New-Item -ItemType Directory -Force -Path "../android/app/src/main/assets/zkeys" | Out-Null
    }
    Copy-Item "${circuit}_final.zkey" -Destination "../android/app/src/main/assets/zkeys/" -Force
}

Write-Host "Done! ZK proving keys have been generated and copied to android/app/src/main/assets/zkeys/"
cd ..
