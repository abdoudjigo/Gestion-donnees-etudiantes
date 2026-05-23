import psycopg2

    #jme connect à la DB de postgres
def get_connection ():
    return psycopg2.connect(
    host = "localhost",
    user = "postgres",
    database = "project_gestion_donnees_etudiantes",
    
    password = "5853500"
)


connection = get_connection()

cursor = connection.cursor()
cursor.execute("SELECT * FROM notes")
resultat = cursor.fetchall()

print(resultat)

cursor.close
connection.close