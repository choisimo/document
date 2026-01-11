## 1:1 (One to One)

    한 테이블의 레코드가 다른 테이블의 단 하나의 레코드와만 연결되는 경우를 말한다.
    예시) 사람과 그 사람의 여권 정보를 저장하는 경우, 
    한 사람은 단 한개의 여권만 가지고, 한 여권은 한 사람에게만 속하는 경우

### 예시

    CREATE TABLE Users (
        UserID INT PRIMARY KEY,
        Username VARCHAR(255)
    );

    CREATE TABLE UserDetails (
        DetailID INT PRIMARY KEY,
        UserID INT UNIQUE,
        Address VARCHAR(255),
        Phone VARCHAR(20),
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
    );


## 1:N
    
    한 테이블의 레코드가 다른 테이블의 여러 레코드와 연결될 수 있는 경우를 말한다.
    예시) 한 사용자가 여러 개의 게시글을 작성할 수 있는 경우,
    사용자와 게시글 사이에는 1:N 관계가 성립

### 예시 

    CREATE TABLE Users (
        UserID INT PRIMARY KEY,
        Username VARCHAR(255)
    );

    CREATE TABLE Orders (
        OrderID INT PRIMARY KEY,
        OrderDate DATE,
        UserID INT,
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
    );

## N:1

    여러 테이블의 레코드가 다른 테이블의 단 하나의 레코드와 연결될 수 있는 경우를 말한다
    예시) 여러 게시글이 한 명의 사용자에게 속하는 경우,
    게시글과 사용자 사이에는 N:1 관계가 성립

## N:M

    한 테이블의 여러 레코드가 다른 테이블의 여러 레코드와 연결될 수 있는 경우를 말한다.
    예시) 학생들이 여러 과목을 수강할 수 있고, 한 과목이 여러 학생에게 가르쳐질 수 있는 경우,
    학생과 과목 사이에는 N:M 관계가 성립

### 예시

    CREATE TABLE Students (
        StudentID INT PRIMARY KEY,
        StudentName VARCHAR(255)
    );

    CREATE TABLE Courses (
        CourseID INT PRIMARY KEY,
        CourseName VARCHAR(255)
    );

    CREATE TABLE Enrollment (
        StudentID INT,
        CourseID INT,
        EnrollmentDate DATE,
        PRIMARY KEY (StudentID, CourseID),
        FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
        FOREIGN KEY (CourseID) REFERENCES Courses(CourseID)
    );
