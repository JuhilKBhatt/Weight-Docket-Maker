#!/bin/bash
# ./backend/run_printer.sh

SPOOL_DIR="print_spool"
PROC_DIR="$SPOOL_DIR/processing"

mkdir -p "$SPOOL_DIR"
mkdir -p "$PROC_DIR"

echo "🖨️  Async Watcher started."
echo "   Watching: $SPOOL_DIR"
echo "   Queueing: $PROC_DIR"

# Enable nullglob to handle empty directories gracefully
shopt -s nullglob

while true; do
    # 1. INSTANTLY CLAIM FILES
    # Move all new PDFs to processing to unblock the UI
    for file in "$SPOOL_DIR"/*.pdf; do
        if [ -f "$file" ]; then
            mv "$file" "$PROC_DIR/"
            echo "📥 Queued: $(basename "$file")"
        fi
    done

    # 2. PROCESS QUEUE
    for file in "$PROC_DIR"/*.pdf; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            
            # Extract Copies
            if [[ "$filename" =~ Qty-([0-9]+) ]]; then
                COPIES="${BASH_REMATCH[1]}"
            else
                COPIES=1
            fi

            echo "🖨️  Printing $COPIES copies of $filename..."

            # Send to CUPS (lp queues immediately, so this is fast)
            lp -n "$COPIES" -o fit-to-page "$file"

            # Delete
            rm "$file"
        fi
    done

    sleep 2
done