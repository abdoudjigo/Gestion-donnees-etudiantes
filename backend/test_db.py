from database import get_connection

connection = get_connection()

cursor = connection.cursor()
cursor.execute("SELECT * FROM notes")
resultat = cursor.fetchall()

print(resultat)

cursor.close
connection.close