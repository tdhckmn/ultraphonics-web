#!/bin/bash

# --- CONFIGURATION ---
# Reads credentials from environment variables:
# - TRELLO_API_KEY
# - TRELLO_API_TOKEN
# - TRELLO_LIST_ID
#
# Usage: ./upload_to_trello.sh /path/to/your/file.json
# ---------------------

# Check for a file path argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 /path/to/your.json"
    exit 1
fi

JSON_FILE="$1"

# --- VALIDATION ---

# Check if JSON file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file not found at $JSON_FILE"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')"
    exit 1
fi

# Check for required environment variables
for var in TRELLO_API_KEY TRELLO_API_TOKEN TRELLO_LIST_ID; do
    if [ -z "${!var}" ]; then
        echo "Error: Environment variable $var is not set."
        exit 1
    fi
done

# --- SCRIPT BODY ---

echo "Starting Trello card creation from $JSON_FILE..."
echo "---"

# Read the JSON file and loop through each item in the array
jq -c '.[]' "$JSON_FILE" | while IFS= read -r item; do
    
    # Extract the name for the card title
    card_name=$(echo "$item" | jq -r '.lastKnownName')

    # --- THIS IS THE MODIFIED LINE ---
    # Set the card description to the original, compact JSON payload
    card_desc="$item"
    # ---------------------------------

    echo "Creating card: $card_name"

    # Make the API call to Trello using curl
    output=$(curl -s -X POST "https://api.trello.com/1/cards" \
      --data-urlencode "key=$TRELLO_API_KEY" \
      --data-urlencode "token=$TRELLO_API_TOKEN" \
      --data-urlencode "idList=$TRELLO_LIST_ID" \
      --data-urlencode "name=$card_name" \
      --data-urlencode "desc=$card_desc" \
      -w "\n%{http_code}")

    # Extract the last line (which we know is the http_code)
    http_code=$(echo "$output" | tail -n1)
    
    # Extract the response body (everything except the last line)
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
             : 
        else
             echo "$response_body"
        fi
        
        echo ""
        echo "Script stopped. Please check your API Key, Token, or List ID."
        exit 1 # Exit the script immediately
    fi
    
    # Add a 1-second delay to avoid hitting Trello's API rate limits
    sleep 1

done

echo "---"
echo "✅ Done! All items processed."