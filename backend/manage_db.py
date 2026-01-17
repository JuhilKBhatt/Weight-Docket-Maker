# ./backend/app/utilities/manage_db.py
import os
import sys
import subprocess

def run_command(command):
    try:
        subprocess.check_call(command, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        sys.exit(1)

def main():
    print("========================================")
    print("   Database Migration Manager")
    print("========================================")
    print("1. Detect changes & Create migration file")
    print("2. Apply migration to Database")
    print("3. Reset Database (DELETE ALL DATA)")
    print("0. Exit")
    
    choice = input("\nEnter choice: ")

    if choice == '1':
        msg = input("Enter a short description of changes (e.g., 'added_email_to_docket'): ")
        if not msg:
            print("Message required.")
            return
        # This compares your models.py to the actual DB
        print(f"\nGenerating migration script: {msg}...")
        run_command(f'alembic revision --autogenerate -m "{msg}"')
        print("\n✅ Migration file created in /alembic/versions/")
        print("You should review it before applying.")

    elif choice == '2':
        print("\nApplying changes to database...")
        run_command("alembic upgrade head")
        print("\n✅ Database updated successfully!")

    elif choice == '3':
        confirm = input("⚠️  ARE YOU SURE? This will DELETE ALL DATA. (yes/no): ")
        if confirm.lower() == 'yes':
            # Runs your original reset script
            from app.utilities import reset_tables
        else:
            print("Cancelled.")

    elif choice == '0':
        print("Exiting.")
    else:
        print("Invalid choice.")

if __name__ == "__main__":
    main()