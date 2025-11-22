#!/bin/bash

# --- CONFIGURATION ---
# IMPORTANT: Trello List IDs are hardcoded below.
# This script still requires environment variables for credentials:
# - TRELLO_API_KEY
# - TRELLO_API_TOKEN
#
# Usage: ./upload_to_trello.sh /path/to/your/file.json
# ---------------------

# Hardcoded Trello List IDs
TRELLO_LIST_ID="69067ac796978f0a31559f53"
TRELLO_LIST_ID_SKIPPED="69210bc76d6df71f7ddcbd94"


# Check for a file path argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 /path/to/your.json"
    exit 1
fi

# IMPORTANT: Always quote the variable to handle spaces and shell expansion
JSON_FILE="$1"

# --- VALIDATION ---

# Check if JSON file exists (MUST use quotes around $JSON_FILE)
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file not found at $JSON_FILE"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')"
    exit 1
fi

# Check for required environment variables (ONLY API KEY and TOKEN now)
for var in TRELLO_API_KEY TRELLO_API_TOKEN; do
    if [ -z "${!var}" ]; then
        echo "Error: Environment variable $var is not set."
        exit 1
    fi
done

# We no longer need the 'TRELLO_LIST_ID_SKIPPED is not set' check as it's hardcoded.

# --- SCRIPT BODY ---

echo "Starting Trello card creation from $JSON_FILE..."
echo "---"

# Read the JSON file and loop through each item in the array
# Process substitution (< <(...)) is used to keep the 'exit 1' in the main shell.
while IFS= read -r item; do
    # Extract values
    card_name=$(echo "$item" | jq -r '.lastKnownName')
    skipped=$(echo "$item" | jq -r '.skipped // false')

    # Choose list based on .skipped
    # This logic now uses the hardcoded variables directly
    if [ "$skipped" = "true" ]; then
        target_list_id="$TRELLO_LIST_ID_SKIPPED"
    else
        target_list_id="$TRELLO_LIST_ID"
    fi

    # Description is the compact JSON payload
    card_desc="$item"

    echo "Creating card: $card_name (list: $target_list_id)"

    # Create card
    output=$(curl -s -X POST "https://api.trello.com/1/cards" \
      --data-urlencode "key=$TRELLO_API_KEY" \
      --data-urlencode "token=$TRELLO_API_TOKEN" \
      --data-urlencode "idList=$target_list_id" \
      --data-urlencode "name=$card_name" \
      --data-urlencode "desc=$card_desc" \
      -w "\n%{http_code}")

    http_code=$(echo "$output" | tail -n1)
    response_body=$(echo "$output" | sed '$d')

    # --- ERROR CHECK ---
    if [ "$http_code" -ne 200 ]; then
        echo ""
        echo "=============================================="
        echo "🛑 ERROR: Failed to create card '$card_name'."
        echo "API request failed with HTTP status: $http_code"
        echo "=============================================="
        echo ""
        echo "Trello's response:"
        if echo "$response_body" | jq . 2>/dev/null; then
            # If the response is valid JSON, pretty-print it
            echo "$response_body" | jq .
        else
            # Otherwise, just print the raw response
            echo "$response_body"
        fi
        echo ""
        echo "Script stopped. Please check your API Key, Token, or List IDs."
        exit 1
    fi

    # Avoid rate limits
    sleep 1
# IMPORTANT: Quoting $JSON_FILE here prevents errors with spaces in the path
done < <(jq -c '.[]' "$JSON_FILE")

echo "---"
echo "✅ Done! All items processed."