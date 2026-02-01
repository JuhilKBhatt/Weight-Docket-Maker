# backend/manage_db.py
import os
import sys
import subprocess
from app.utilities import reset_tables  # Import the module, don't run it

BACKUP_ROOT = "/backups"

def run_command(command):
    try:
        subprocess.check_call(command, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        sys.exit(1)

def list_backups():
    all_backups = []
    for root, dirs, files in os.walk(BACKUP_ROOT):
        for f in files:
            if f.endswith(".sql"):
                all_backups.append(os.path.join(root, f))
    return sorted(all_backups, reverse=True)

def main():
    print("========================================")
    print("   Database Migration Manager")
    print("========================================")
    print("1. Detect changes & Create migration file")
    print("2. Apply migration to Database")
    print("3. Reset Database (DELETE DATA)")
    print("4. Restore from Backup file")
    print("0. Exit")
    
    choice = input("\nEnter choice: ")

    if choice == '1':
        msg = input("Enter a short description of changes (e.g., 'added_email_to_docket'): ")
        if not msg:
            print("Message required.")
            return
        print(f"\nGenerating migration script: {msg}...")
        run_command(f'alembic revision --autogenerate -m "{msg}"')
        print("\n✅ Migration file created in /alembic/versions/")
        print("You should review it before applying.")

    elif choice == '2':
        print("\nApplying changes to database...")
        run_command("alembic upgrade head")
        print("\n✅ Database updated successfully!")

    elif choice == '3':
        print("\n--- RESET SELECTION ---")
        print("1. DELETE EVERYTHING (All Tables)")
        print("2. Dockets Only (Dockets, Items, Deductions)")
        print("3. Invoices Only (Invoices, Items, Transport, Saved Bills/Accounts)")
        print("4. Settings Only (Global, Currency, Units)")
        print("0. Cancel")
        
        sub_choice = input("\nSelect what to reset: ")
        
        if sub_choice == '0':
            print("Cancelled.")
            return

        # Map choice to reset_tables arguments
        groups = None
        target_name = "ALL DATA"
        
        if sub_choice == '2':
            groups = ['dockets']
            target_name = "DOCKETS"
        elif sub_choice == '3':
            groups = ['invoices']
            target_name = "INVOICES"
        elif sub_choice == '4':
            groups = ['settings']
            target_name = "SETTINGS"
        elif sub_choice != '1':
            print("Invalid choice.")
            return

        confirm = input(f"⚠️  ARE YOU SURE? This will DELETE {target_name}. (yes/no): ")
        if confirm.lower() == 'yes':
            # Call the function from the imported module
            reset_tables.reset_database(groups)
        else:
            print("Cancelled.")

    elif choice == '4':
        backups = list_backups()
        if not backups:
            print("No backups found in /backups")
            return
        
        print("\nAvailable Backups:")
        for idx, path in enumerate(backups[:15]): # Show last 15
            print(f"{idx + 1}. {path.replace(BACKUP_ROOT, '')}")
            
        pick = input("\nSelect number to restore (or 0 to cancel): ")
        if pick != '0' and pick.isdigit():
            try:
                target = backups[int(pick)-1]
                confirm = input(f"RESTORE {target}? Current data will be OVERWRITTEN. (yes/no): ")
                if confirm.lower() == 'yes':
                    db_user = os.getenv("POSTGRES_USER", "user")
                    db_name = os.getenv("POSTGRES_DB", "weight_docket_db")
                    os.environ["PGPASSWORD"] = os.getenv("POSTGRES_PASSWORD", "password")

                    cmd = f"psql -h db -U {db_user} -d {db_name} -f {target}"
                    
                    print(f"Restoring {db_name}...")
                    subprocess.run(cmd, shell=True, check=True)
                    print("\n✅ Restore complete!")
            except IndexError:
                print("Invalid selection.")
            except subprocess.CalledProcessError as e:
                print(f"\n❌ Restore failed: {e}")

    elif choice == '0':
        print("Exiting.")
    else:
        print("Invalid choice.")

if __name__ == "__main__":
    main()