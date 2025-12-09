#!/bin/bash

# Claude Code Status Line
# Displays: Model | Context% | Cost (Duration) | Lines +/- | Directory

# Read and parse JSON input
JSON=$(cat)

# Core fields
MODEL_NAME=$(echo "$JSON" | jq -r '.model.display_name // "Unknown"')
MODEL_ID=$(echo "$JSON" | jq -r '.model.id // "Unknown"')
CWD=$(echo "$JSON" | jq -r '.cwd // "~"')
TRANSCRIPT_PATH=$(echo "$JSON" | jq -r '.transcript_path // ""')

# Cost metrics
COST_USD=$(echo "$JSON" | jq -r '.cost.total_cost_usd // 0')
DURATION_MS=$(echo "$JSON" | jq -r '.cost.total_duration_ms // 0')
LINES_ADDED=$(echo "$JSON" | jq -r '.cost.total_lines_added // 0')
LINES_REMOVED=$(echo "$JSON" | jq -r '.cost.total_lines_removed // 0')

# Context window calculation from transcript JSONL
# Parse last assistant message with usage data for accurate token count
TOTAL_TOKENS=0
CONTEXT_PCT=0
MAX_TOKENS=200000  # Default 200K context

# Check if model is Sonnet 4.5 with 1M context
if [[ "$MODEL_ID" == *"sonnet-4-5"* ]] || [[ "$MODEL_ID" == *"sonnet-4.5"* ]]; then
  MAX_TOKENS=1000000
fi

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Get token usage from last assistant message in transcript
  # Sum: input_tokens + cache_read_input_tokens + cache_creation_input_tokens
  TOTAL_TOKENS=$(tail -n 100 "$TRANSCRIPT_PATH" 2>/dev/null | \
    jq -s 'map(select(.type == "assistant" and .message.usage)) | last | .message.usage | (.input_tokens // 0) + (.cache_read_input_tokens // 0) + (.cache_creation_input_tokens // 0)' 2>/dev/null || echo "0")

  # Handle null/empty result
  [ "$TOTAL_TOKENS" = "null" ] || [ -z "$TOTAL_TOKENS" ] && TOTAL_TOKENS=0

  # Calculate percentage
  if [ "$TOTAL_TOKENS" -gt 0 ] 2>/dev/null; then
    CONTEXT_PCT=$((TOTAL_TOKENS * 100 / MAX_TOKENS))
    [ "$CONTEXT_PCT" -gt 100 ] && CONTEXT_PCT=100
  fi
fi

# Format duration (ms to human-readable)
DURATION_SEC=$((DURATION_MS / 1000))
DURATION_MIN=$((DURATION_SEC / 60))
DURATION_SEC_REM=$((DURATION_SEC % 60))
if [ $DURATION_MIN -gt 0 ]; then
  DURATION="${DURATION_MIN}m${DURATION_SEC_REM}s"
else
  DURATION="${DURATION_SEC}s"
fi

# Format cost (2 decimal places)
COST=$(printf "%.2f" "$COST_USD")

# Format tokens (K suffix for thousands)
if [ "$TOTAL_TOKENS" -ge 1000 ]; then
  TOKEN_DISPLAY="$((TOTAL_TOKENS / 1000))K"
else
  TOKEN_DISPLAY="$TOTAL_TOKENS"
fi

# Context color: green < 50%, yellow 50-80%, red > 80%
if [ "$CONTEXT_PCT" -ge 80 ]; then
  CTX_COLOR="\033[31m"  # Red
elif [ "$CONTEXT_PCT" -ge 50 ]; then
  CTX_COLOR="\033[33m"  # Yellow
else
  CTX_COLOR="\033[32m"  # Green
fi

# Shorten directory path (show last 2 components)
SHORT_CWD=$(echo "$CWD" | rev | cut -d'/' -f1-2 | rev)

# Output: Model | Context | Cost | Lines | Directory
printf "\033[36m%s\033[0m | %b🧠 %s (%d%%)\033[0m | \033[32m\$%s\033[0m (%s) | \033[35m+%d/-%d\033[0m | \033[34m%s\033[0m" \
  "$MODEL_NAME" \
  "$CTX_COLOR" \
  "$TOKEN_DISPLAY" \
  "$CONTEXT_PCT" \
  "$COST" \
  "$DURATION" \
  "$LINES_ADDED" \
  "$LINES_REMOVED" \
  "$SHORT_CWD"
