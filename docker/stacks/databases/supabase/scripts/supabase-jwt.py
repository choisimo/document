import jwt
import datetime
import os

# Get the secret from an environment variable for security
# Make sure to set SUPABASE_JWT_SECRET in your environment before running this script
# Example: export SUPABASE_JWT_SECRET="your_actual_secret_from_env_file"
supabase_jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")

if not supabase_jwt_secret:
    print("Error: SUPABASE_JWT_SECRET environment variable not set.")
    print("Please set it before running this script (e.g., export SUPABASE_JWT_SECRET=\"your_actual_secret\").")
    exit(1)

# Define the payload for the JWT
# The 'role' claim is crucial for PostgREST to assign permissions
payload = {
    "role": "service_role",
    "iss": "n8n-supabase-connector",  # Issuer (optional, but good practice)
    "iat": datetime.datetime.utcnow(),  # Issued at time
    "exp": datetime.datetime.utcnow() + datetime.timedelta(days=365) # Expiration time (adjust as needed)
}

# Encode the JWT
service_role_jwt = jwt.encode(payload, supabase_jwt_secret, algorithm="HS256")

print("Generated Service Role JWT:")
print(service_role_jwt)

