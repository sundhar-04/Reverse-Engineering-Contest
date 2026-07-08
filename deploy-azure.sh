#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  Azure Deployment Script — ReverseCode Arena
#  Usage: bash deploy-azure.sh
#  Prerequisites: Azure CLI installed (https://aka.ms/install-azps)
# ============================================================

RESOURCE_GROUP="ReverseCodeRG"
VM_NAME="ReverseCodeVM"
VM_SIZE="Standard_B2s"             # 2 vCPU, 4GB — ~$30/mo
LOCATION="westus2"                 # Azure for Students: use westus2/westus3/centralus/westeurope
ADMIN_USER="azureuser"
FRONTEND_PORT=3000
BACKEND_PORT=8000
REPO_URL="https://github.com/anomalyco/Reverse-Engineering-Contest.git"

# ---------- Colors ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
step()  { echo; echo -e "${GREEN}========================================${NC}"; echo -e "${GREEN} Step $1${NC}"; echo -e "${GREEN}========================================${NC}"; }

# ---------- Check Azure CLI ----------
step "1/8" "Check Prerequisites"
if ! command -v az &>/dev/null; then
    err "Azure CLI not found. Install it: https://aka.ms/install-azcliz"
fi
if ! az account show &>/dev/null; then
    err "Not logged into Azure. Run: az login"
fi
info "Azure CLI is ready"

# ---------- Variables ----------
AZURE_USER=$(az account show --query user.name -o tsv)
SUBSCRIPTION=$(az account show --query id -o tsv)
info "Logged in as: $AZURE_USER"
info "Subscription: $SUBSCRIPTION"

# ---------- Create Resource Group ----------
step "2/8" "Create Resource Group"
# Delete if it exists from a previous failed attempt (wrong region)
if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
    info "Removing old resource group (was in wrong region)..."
    az group delete --name "$RESOURCE_GROUP" --yes 2>/dev/null || true
fi
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o table
info "Resource group '$RESOURCE_GROUP' created in '$LOCATION'"

# ---------- Create VM ----------
step "3/8" "Create Virtual Machine"
info "Creating VM '$VM_NAME' (size: $VM_SIZE) — this takes ~2 minutes..."
az vm create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --image Ubuntu2204 \
    --size "$VM_SIZE" \
    --admin-username "$ADMIN_USER" \
    --generate-ssh-keys \
    --public-ip-sku Standard \
    -o table

# Get the public IP
VM_IP=$(az vm show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --show-details \
    --query publicIps \
    -o tsv)
info "VM created! Public IP: $VM_IP"

# ---------- Open Ports ----------
step "4/8" "Open Ports"
for PORT in $FRONTEND_PORT $BACKEND_PORT 22; do
    az vm open-port \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VM_NAME" \
        --port "$PORT" \
        --priority "$((PORT + 1000))" \
        -o table
done
info "Ports $FRONTEND_PORT (frontend), $BACKEND_PORT (backend), 22 (SSH) opened"

# ---------- Install Docker on VM ----------
step "5/8" "Install Docker on VM"
info "Connecting via SSH to install Docker..."
ssh -o StrictHostKeyChecking=no "$ADMIN_USER@$VM_IP" << 'SSH_END'
    set -e
    # Install Docker
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    # Apply group change without re-login
    newgrp docker << 'DOCKER_END'
        echo "Docker installed and ready"
DOCKER_END
SSH_END
info "Docker installed"

# ---------- Deploy Application ----------
step "6/8" "Deploy ReverseCode Arena"
info "Cloning repo and starting containers..."
ssh "$ADMIN_USER@$VM_IP" << 'DEPLOY_END'
    set -e
    git clone https://github.com/anomalyco/Reverse-Engineering-Contest.git
    cd Reverse-Engineering-Contest

    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -hex 64)
    echo "JWT_SECRET=$JWT_SECRET" > .env

    # Start all services
    docker compose up -d

    # Wait for backend to be ready
    echo "Waiting for backend..."
    for i in $(seq 1 30); do
        if curl -s http://localhost:8000/api/contests/public/active > /dev/null 2>&1; then
            echo "Backend is ready"
            break
        fi
        sleep 2
    done

    # Create admin user
    docker exec reversecode-backend python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.hash import bcrypt
from datetime import datetime

async def init():
    client = AsyncIOMotorClient('mongodb://mongodb:27017')
    db = client['reversecode_arena']
    existing = await db.admins.find_one({'username': 'admin'})
    if not existing:
        await db.admins.insert_one({
            'username': 'admin',
            'password': bcrypt.hash('weguysfromcodingninjas'),
            'email': 'admin@reversecode.local',
            'role': 'admin',
            'is_active': True,
            'created_at': datetime.utcnow()
        })
        print('Admin user created')
    else:
        print('Admin user already exists')
    client.close()

asyncio.run(init())
"

    echo "Deployment complete!"
DEPLOY_END

# ---------- Show Access Info ----------
step "7/8" "Deployment Summary"
echo ""
echo -e "${GREEN}  ReverseCode Arena is LIVE!${NC}"
echo ""
echo -e "  Frontend:  ${GREEN}http://$VM_IP:$FRONTEND_PORT${NC}"
echo -e "  Backend:   ${GREEN}http://$VM_IP:$BACKEND_PORT${NC}"
echo ""
echo -e "  Admin Login:"
echo -e "    URL:     ${GREEN}http://$VM_IP:$FRONTEND_PORT/login${NC}"
echo -e "    Username: admin"
echo -e "    Password: weguysfromcodingninjas"
echo ""
echo -e "  SSH:       ssh $ADMIN_USER@$VM_IP"

# ---------- Cost Management ----------
step "8/8" "Cost Management"
echo ""
echo -e "  ${YELLOW}Stop VM (preserves data, stops billing):${NC}"
echo "    az vm deallocate -g $RESOURCE_GROUP -n $VM_NAME"
echo ""
echo -e "  ${YELLOW}Start VM (resumes billing):${NC}"
echo "    az vm start -g $RESOURCE_GROUP -n $VM_NAME"
echo ""
echo -e "  ${YELLOW}Delete everything (no more charges):${NC}"
echo "    az group delete -n $RESOURCE_GROUP --yes --no-wait"
echo ""
echo -e "  ${GREEN}Total cost estimate: ~\$36/month (B2s)${NC}"
echo "  With \$100 student credits → ~2.5 months free"
echo "  Or use B1s (\$14/mo) → swap 'VM_SIZE=Standard_B1s' above"
echo ""
