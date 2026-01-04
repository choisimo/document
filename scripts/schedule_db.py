import mariadb

def databaseConnection():
    connection = mariadb.connect(
        host='',
        port=,
        user='',
        password='',
        database=''
    ) 
    return connection

def alertInsertion(value1, value2, connection):
    cursor = connection.cursor()
    
    cursor.execute("insert into alert(type,regdate) values(%s, %s)", (value1, value2))
    connection.commit()

def logInsertion(value1, value2, connection):
    cursor = connection.cursor()
    cursor.execute("insert into logfile(type,regdate) values(%s, %s)", (value1, value2))
    connection.commit()
