import psycopg2
import os

password=os.getenv("POSTGRES_PASSWORD")
connection = psycopg2.connect(database="postgres", user="postgres", password=password, host="db", port=5432)

cursor = connection.cursor()

cursor.execute("SELECT * from portal.portal_users;")

# Fetch all rows from database
record = cursor.fetchall()

print("Data from Database:- ", record)
