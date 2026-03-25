#!/bin/bash

# release.sh - Complete Release Script
# Handles version management, git workflow, and Android APK build

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VERSION_FILE="version-code.txt"
ANDROID_DIR="android"
MANIFEST_FILE="$ANDROID_DIR/twa-manifest.json"
KEYSTORE_FILE="$ANDROID_DIR/android.keystore"

# Helper functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to get and increment version code
increment_version_code() {
    log "Managing version code..."

    local current_code
    if [ -f "$VERSION_FILE" ]; then
        current_code=$(cat "$VERSION_FILE")
    else
        current_code=0
    fi

    local new_code=$((current_code + 1))
    echo "$new_code" > "$VERSION_FILE"

    log "Version code incremented: $current_code → $new_code"
    echo "$new_code"
}

# Function to prompt for version name
prompt_version_name() {
    echo
    while true; do
        read -p "Enter version name (e.g., 1.0.5): " version_name

        # Remove 'v' prefix if present
        version_name=${version_name#v}

        if [[ $version_name =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            log "Version name set: $version_name"
            echo "$version_name"
            return 0
        else
            error "Invalid format. Use x.y.z (e.g., 1.0.5)"
        fi
    done
}

# Function to handle git workflow
git_workflow() {
    local version_name=$1

    log "Starting Git workflow..."

    # Add all changes
    log "Adding all uncommitted files..."
    git add .
    success "All changes staged"

    # Create commit
    local commit_msg="Release v$version_name"
    log "Creating commit: $commit_msg"

    if git diff --cached --quiet; then
        warning "No changes to commit"
    else
        git commit -m "$commit_msg"
        success "Changes committed"
    fi

    # Create tag
    local tag_name="v$version_name"
    log "Creating tag: $tag_name"
    git tag "$tag_name" 2>/dev/null || warning "Tag already exists"

    # Push to server
    log "Pushing to server..."
    git push pro main
    git push pro "$tag_name" 2>/dev/null || warning "Tag already pushed"

    success "Git workflow completed - server deployment started"
}

# Function to update manifest version
update_manifest_version() {
    local version_name=$1
    local version_code=$2

    log "Updating manifest with version $version_name (code: $version_code)"

    if [ ! -f "$MANIFEST_FILE" ]; then
        error "Manifest file not found: $MANIFEST_FILE"
        return 1
    fi

    # Backup manifest
    cp "$MANIFEST_FILE" "$MANIFEST_FILE.backup"

    # Update using jq if available, otherwise sed
    if command -v jq >/dev/null 2>&1; then
        jq --arg name "$version_name" --argjson code "$version_code" \
           '.appVersionName = $name | .appVersionCode = $code' \
           "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && \
           mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"
    else
        sed -i.bak "s/\"appVersionName\": \"[^\"]*\"/\"appVersionName\": \"$version_name\"/" "$MANIFEST_FILE"
        sed -i.bak "s/\"appVersionCode\": [0-9]*/\"appVersionCode\": $version_code/" "$MANIFEST_FILE"
        rm -f "$MANIFEST_FILE.bak"
    fi

    success "Manifest updated successfully"
}

# Function to initialize Android directory
init_android_directory() {
    log "Initializing Android directory..."

    mkdir -p "$ANDROID_DIR"
    cd "$ANDROID_DIR"

    # Check if already initialized
    if [ -f "twa-manifest.json" ] && [ -f "android.keystore" ]; then
        log "Android directory already initialized"
        cd ..
        return 0
    fi

    # Initialize with bubblewrap if needed
    if [ ! -f "twa-manifest.json" ]; then
        log "Creating initial TWA manifest..."

        # Create expect script for init
        cat > init_expect.exp << 'EOF'
#!/usr/bin/expect -f
set timeout 60
spawn npx bubblewrap init
expect {
    "*Domain*" { send "dotmag.ir\r"; exp_continue }
    "*Name*" { send "Dot\r"; exp_continue }
    "*Launcher name*" { send "Dot\r"; exp_continue }
    "*Display mode*" { send "fullscreen\r"; exp_continue }
    "*Orientation*" { send "portrait-primary\r"; exp_continue }
    "*Theme color*" { send "#D73B3A\r"; exp_continue }
    "*Background color*" { send "#000000\r"; exp_continue }
    "*Start URL*" { send "/\r"; exp_continue }
    "*Icon URL*" { send "https://dotmag.ir/assets/icons/icon-512x512.png\r"; exp_continue }
    "*Maskable icon*" { send "https://dotmag.ir/assets/icons/icon-512x512-maskable.png\r"; exp_continue }
    "*Monochrome icon*" { send "https://dotmag.ir/assets/icons/icon-192x192.png\r"; exp_continue }
    "*Shortcuts*" { send "n\r"; exp_continue }
    "*Package ID*" { send "ir.dotmag.twa\r"; exp_continue }
    "*Key store*" { send "android.keystore\r"; exp_continue }
    "*Key name*" { send "dotmag_release\r"; exp_continue }
    "*Create new*" { send "y\r"; exp_continue }
    "*Key store password*" { send "dotmag123\r"; exp_continue }
    "*Key password*" { send "dotmag123\r"; exp_continue }
    "*First and Last Name*" { send "Dot Mag\r"; exp_continue }
    "*Organizational Unit*" { send "Development\r"; exp_continue }
    "*Organization*" { send "Dot Mag\r"; exp_continue }
    "*City*" { send "Tehran\r"; exp_continue }
    "*State*" { send "Tehran\r"; exp_continue }
    "*Country Code*" { send "IR\r"; exp_continue }
    "*correct*" { send "y\r"; exp_continue }
    eof
}
EOF

        chmod +x init_expect.exp
        ./init_expect.exp
        rm -f init_expect.exp

        success "Android directory initialized"
    fi

    # Apply our custom settings
    if [ -f "twa-manifest.json" ]; then
        log "Applying custom TWA settings..."

        if command -v jq >/dev/null 2>&1; then
            jq '.fallbackType = "webview" | .enableSiteSettingsShortcut = false' \
               twa-manifest.json > twa-manifest.json.tmp && \
               mv twa-manifest.json.tmp twa-manifest.json
        else
            sed -i.bak 's/"fallbackType": "customtabs"/"fallbackType": "webview"/' twa-manifest.json
            sed -i.bak 's/"enableSiteSettingsShortcut": true/"enableSiteSettingsShortcut": false/' twa-manifest.json
            rm -f twa-manifest.json.bak
        fi

        success "Custom TWA settings applied"
    fi

    cd ..
}

# Function to update bubblewrap configuration
update_bubblewrap_config() {
    local version_name=$1

    log "Updating bubblewrap configuration..."

    cd "$ANDROID_DIR"

    # Create expect script for update - pass the version automatically
    cat > update_expect.exp << EOF
#!/usr/bin/expect -f
set timeout 60
spawn npx bubblewrap update --manifest twa-manifest.json
expect {
    "*version*" { send "$version_name\r"; exp_continue }
    "*regenerate*" { send "y\r"; exp_continue }
    eof
}
EOF

    chmod +x update_expect.exp
    ./update_expect.exp
    rm -f update_expect.exp

    cd ..
    success "Bubblewrap configuration updated with version $version_name"
}

# Function to clean old APK files
clean_old_apks() {
    log "Cleaning old APK files..."

    cd "$ANDROID_DIR"

    # Remove old APK and AAB files
    find . -name "*.apk" -type f -delete 2>/dev/null || true
    find . -name "*.aab" -type f -delete 2>/dev/null || true

    cd ..
    success "Old APK files cleaned"
}

# Function to build APK
build_android_apk() {
    local version_name=$1

    log "Building Android APK..."

    cd "$ANDROID_DIR"

    # Create expect script for build
    cat > build_expect.exp << 'EOF'
#!/usr/bin/expect -f
set timeout 300
spawn npx bubblewrap build
expect {
    "*regenerate*" { send "y\r"; exp_continue }
    "*Password for the Key Store*" { send "dotmag123\r"; exp_continue }
    "*Password for the Alias*" { send "dotmag123\r"; exp_continue }
    eof
}
EOF

    chmod +x build_expect.exp
    ./build_expect.exp
    rm -f build_expect.exp

    # Rename APK files with version tag
    log "Renaming APK files with version tag..."

    find . -name "*.apk" -type f | while read apk; do
        dirname=$(dirname "$apk")
        basename=$(basename "$apk" .apk)
        new_name="${dirname}/dotmag-v${version_name}-${basename}.apk"
        mv "$apk" "$new_name"
        success "APK renamed: $(basename "$new_name")"
    done

    find . -name "*.aab" -type f | while read aab; do
        dirname=$(dirname "$aab")
        basename=$(basename "$aab" .aab)
        new_name="${dirname}/dotmag-v${version_name}-${basename}.aab"
        mv "$aab" "$new_name"
        success "AAB renamed: $(basename "$new_name")"
    done

    cd ..
    success "Android APK build completed"
}

# Function to display summary
show_summary() {
    local version_name=$1
    local version_code=$2

    echo
    log "===== RELEASE SUMMARY ====="
    echo "Version Name: v$version_name"
    echo "Version Code: $version_code"
    echo

    success "✅ Git workflow completed - server deployment started"
    success "✅ Android APK build completed"

    echo
    log "Built APK files:"
    find "$ANDROID_DIR" -name "dotmag-v${version_name}-*.apk" -type f | while read apk; do
        echo "  📱 $(basename "$apk")"
    done

    find "$ANDROID_DIR" -name "dotmag-v${version_name}-*.aab" -type f | while read aab; do
        echo "  📦 $(basename "$aab")"
    done

    echo
    success "Release process completed successfully! 🚀"
}

# Main execution
main() {
    echo
    log "🚀 Starting Complete Release Process"
    echo

    # Step 1: Increment version code
    local version_code=$(increment_version_code)

    # Step 2: Get version name from user
    local version_name=$(prompt_version_name)

    # Step 3: Git workflow (add, commit, push)
    git_workflow "$version_name"

    # Step 4: Initialize Android directory if needed
    init_android_directory

    # Step 5: Update manifest with new version
    update_manifest_version "$version_name" "$version_code"

    # Step 6: Update bubblewrap configuration
    update_bubblewrap_config "$version_name"

    # Step 7: Clean old APK files
    clean_old_apks

    # Step 8: Build Android APK
    build_android_apk "$version_name"

    # Step 9: Show summary
    show_summary "$version_name" "$version_code"
}

# Check dependencies
check_dependencies() {
    if ! command -v npx >/dev/null 2>&1; then
        error "npx not found. Please install Node.js"
        exit 1
    fi

    if ! command -v expect >/dev/null 2>&1; then
        error "expect not found. Please install: brew install expect"
        exit 1
    fi

    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a git repository"
        exit 1
    fi

    if ! git remote get-url pro > /dev/null 2>&1; then
        error "Remote 'pro' not configured"
        exit 1
    fi
}

# Run dependency check and main function
check_dependencies
main "$@"