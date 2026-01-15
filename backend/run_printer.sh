#!/bin/bash
# ./run_printer.sh

SPOOL_DIR="print_spool"

echo "Watcher started. Monitoring $SPOOL_DIR..."

while true; do
    # Look for files matching the pattern
    for file in "$SPOOL_DIR"/PRINT_Qty-*.pdf; do
        if [ -e "$file" ]; then
            echo "Found: $(basename "$file")"

            # 1. Extract Copies from filename (Qty-X)
            # Uses grep/sed to find the number between 'Qty-' and '_'
            COPIES=$(echo "$file" | grep -o 'Qty-[0-9]*' | cut -d'-' -f2)
            
            # Default to 1 if parsing failed
            if [ -z "$COPIES" ]; then COPIES=1; fi

            echo "Printing $COPIES copies..."

            # 2. Send to default printer
            # -n = Number of copies
            # -o fit-to-page = Avoid cutting off edges
            lp -n "$COPIES" -o fit-to-page "$file"

            # 3. Delete file
            rm "$file"
            echo "Done."
        fi
    done
    sleep 2
done